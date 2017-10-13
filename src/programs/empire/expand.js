'use strict'

/**
 * Scans all currently visible rooms and records useful information about them.
 */

class EmpireExpand extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_EXPAND
  }

  getDescriptor () {
    if (!this.data.colony) {
      return 'seeking'
    }
    return this.data.colony
  }

  main () {
    if (!this.data.colony) {
      const candidate = this.getNextCandidate()
      if (candidate && this.validateRoom(candidate)) {
        this.data.colony = candidate
        this.data.attemptedClaim = 0
        this.data.lastClaimAttempt = false
      }
      return
    }

    this.scout()
    if (!Game.rooms[this.data.colony]) {
      return
    }
    this.colony = Game.rooms[this.data.colony]

    // Don't continue futher until the room is claimed
    if (!this.colony.controller.my) {
      this.claim()
      return
    }

    this.upgrade()
    const sources = this.colony.find(FIND_SOURCES)
    for (let source of sources) {
      this.mine(source)
    }

    // Destroy all neutral and hostile structures immediately
    if (!this.data.hascleared) {
      const structures = this.colony.find(FIND_STRUCTURES)
      for (let structure of structures) {
        if (structure.structureType === STRUCTURE_CONTROLLER) {
          continue
        }
        structure.destroy()
      }
      const sites = this.colony.find(FIND_HOSTILE_CONSTRUCTION_SITES)
      for (let site of sites) {
        site.remove()
      }
      this.data.hascleared = true
      return
    }

    this.hostileSpawns = this.colony.find(FIND_HOSTILE_SPAWNS)
    this.build()

    if (this.hostileSpawns.length > 0) {
      return
    }

    // If the room isn't planned launch the room layout program, otherwise launch construction program

    if (!this.colony.getLayout().isPlanned()) {
      this.launchChildProcess('layout', 'city_layout', {
        'room': this.data.colony
      })
    } else {
      this.launchChildProcess('construct', 'city_construct', {
        'room': this.data.colony
      })
    }

    if (this.colony.getRoomSetting('SELF_SUFFICIENT')) {
      if (!this.data.deathwatch) {
        Room.addCity(this.data.colony)
        this.data.deathwatch = Game.time
      }
      if (Game.time - this.data.deathwatch > 1800) {
        this.suicide()
      }
    }
  }

  getNextCandidate () {
    // If a candidate list already exists use the best scoring candidate from the list.
    if (this.data.candidates && this.data.candidates.length > 0) {
      return this.data.candidates.pop()
    }

    if (typeof this.data.candidateList === 'undefined') {
      this.data.candidateList = this.getCandidateList()
    }
    if (!this.data.candidateScores) {
      this.data.candidateScores = {}
    }

    const startCPU = Game.cpu.getUsed()
    while (this.data.candidateList.length > 0) {
      const testRoom = this.data.candidateList.pop()
      const score = Room.getCityScore(testRoom)
      if (score) {
        this.data.candidateScores[testRoom] = score
      }
      if (Game.cpu.getUsed() - startCPU > 10) {
        return
      }
    }

    const scores = this.data.candidateScores
    this.data.candidates = Object.keys(this.data.candidateScores)
    this.data.candidates.sort(function (a, b) {
      return scores[a] - scores[b]
    })
    return this.data.candidates.pop()
  }

  validateRoom (roomName) {
    const closest = this.getClosestCity(roomName).name
    const path = Game.map.findRoute(closest, roomName)
    return path.length <= 8
  }

  getClosestCity (roomName) {
    const cities = Room.getCities()
    let closest = false
    let distance = Infinity
    for (let city of cities) {
      if (!Game.rooms[city]) {
        continue
      }
      const testDistance = Room.getManhattanDistance(city, roomName)
      if (distance > testDistance) {
        closest = city
        distance = testDistance
      }
    }
    return Game.rooms[closest]
  }

  getCandidateList () {
    const cities = Room.getCities()
    let candidates = []

    for (let city of cities) {
      if (!Game.rooms[city]) {
        continue
      }
      const room = Game.rooms[city]
      if (!room.getRoomSetting('EXPAND_FROM') || !room.isEconomyCapable('EXPAND_FROM')) {
        continue
      }

      let rooms = Room.getRoomsInRange(city, 10)
      for (let room of rooms) {
        if (candidates.indexOf(room) >= 0 || !Room.isClaimable(room)) {
          continue
        }
        if (Room.getManhattanDistance(city, room) <= 9) {
          candidates.push(room)
        }
      }
    }
    return candidates
  }

  scout () {
    const closestCity = this.getClosestCity(this.data.colony)
    const center = new RoomPosition(25, 25, this.data.colony)
    const quantity = Game.rooms[this.data.colony] ? 0 : 1
    const scouts = new qlib.Cluster('scout_' + this.data.colony, closestCity)
    if (!Game.rooms[this.data.colony]) {
      scouts.sizeCluster('spook', quantity)
    }
    scouts.forEach(function (scout) {
      if (scout.room.name === center.roomName) {
        if (scout.pos.getRangeTo(center) <= 20) {
          return
        }
      }
      scout.travelTo(center, {range: 20})
    })
  }

  claim () {
    const controller = this.colony.controller
    if (this.colony.controller.my) {
      return
    }
    const closestCity = this.getClosestCity(this.data.colony)
    const claimer = new qlib.Cluster('claimers_' + this.data.colony, closestCity)

    // Give up 1000 ticks after launching the last claimer and move on to the next candidate room.

    if (this.data.attemptedClaim < 3) {
      if (!this.data.lastClaimAttempt || Game.time - this.data.lastClaimAttempt > 1000) {
        this.data.attemptedClaim++
        this.data.lastClaimAttempt = Game.time
        claimer.sizeCluster('claimer', 1)
      }
    } else if (Game.time - this.data.lastClaimAttempt > 1000) {
      if (claimer.getCreeps().length < 1) {
        delete this.data.colony
        return
      }
    }
    claimer.forEach(function (claimer) {
      if (!claimer.pos.isNearTo(controller)) {
        claimer.travelTo(controller)
      } else if (!controller.my) {
        claimer.claimController(controller)
      }
    })
  }

  mine (source) {
    let spawnRoom = this.colony.energyCapacityAvailable >= 800 ? this.colony : this.getClosestCity(this.data.colony)

    const minerPos = source.getMiningPosition()
    const containers = _.filter(minerPos.lookFor(LOOK_STRUCTURES), (a) => a.structureType === STRUCTURE_CONTAINER)
    const container = containers.length > 0 ? containers[0] : false

    // Build container if it isn't there
    let construction = false
    if (!container) {
      const constructionSites = minerPos.lookFor(LOOK_CONSTRUCTION_SITES)
      if (constructionSites.length > 0) {
        construction = constructionSites[0]
      } else {
        this.colony.createConstructionSite(minerPos, STRUCTURE_CONTAINER)
      }
    }

    const miners = new qlib.Cluster('miner_' + source.id, spawnRoom)
    if (!this.data.deathwatch) {
      miners.sizeCluster('miner', 1)
    }
    miners.forEach(function (miner) {
      if (miner.pos.getRangeTo(minerPos) > 0) {
        miner.travelTo(minerPos)
        return
      }
      if (miner.carry[RESOURCE_ENERGY] > 0) {
        if (construction) {
          miner.build(construction)
          return
        } else if (source.energy <= 0 && container && container.hits < container.hitsMax) {
          miner.repair(container)
          return
        }
      }
      if (source.energy > 0) {
        miner.harvest(source)
      }
    })
  }

  build () {
    const controller = this.colony.controller
    const closestCity = this.getClosestCity(this.data.colony)
    const builders = new qlib.Cluster('builers_' + this.data.colony, closestCity)
    const constructionSites = this.colony.find(FIND_MY_CONSTRUCTION_SITES)
    const site = constructionSites.length > 0 ? constructionSites[0] : false
    const hostileSpawns = this.hostileSpawns
    if (!this.data.deathwatch) {
      builders.sizeCluster('builder', 2)
    }
    builders.forEach(function (builder) {
      if (builder.room.name !== controller.room.name) {
        builder.travelTo(controller)
        return
      }

      if (hostileSpawns.length > 0) {
        const closestSpawn = builder.pos.findClosestByRange(hostileSpawns)
        if (!builder.pos.isNearTo(closestSpawn)) {
          builder.travelTo(closestSpawn)
        } else {
          builder.dismantle(closestSpawn)
        }
        return
      }

      if (builder.recharge()) {
        return
      }

      if (builder.room.energyAvailable < builder.room.energyCapacityAvailable) {
        const structures = builder.room.find(FIND_MY_STRUCTURES, {filter: function (structure) {
          if (structure.structureType !== STRUCTURE_EXTENSION && structure.structureType !== STRUCTURE_SPAWN) {
            return false
          }
          return structure.energyCapacity && structure.energy < structure.energyCapacity
        }})
        const structure = builder.pos.findClosestByRange(structures)

        if (!builder.pos.isNearTo(structure)) {
          builder.travelTo(structure)
        } else {
          builder.transfer(structure, RESOURCE_ENERGY)
        }
        return
      }

      // If there's a construction site buildit
      if (site) {
        const siteDistance = builder.pos.getRangeTo(site)
        if (siteDistance > 2) {
          builder.travelTo(site)
        }
        if (siteDistance <= 3) {
          builder.build(site)
        }
        return
      }

      // As a last resort upgrade controller
      const controllerDistance = builder.pos.getRangeTo(controller)
      if (controllerDistance > 2) {
        builder.travelTo(controller)
      }
      if (controllerDistance <= 3) {
        builder.upgradeController(controller)
      }
    })
  }

  upgrade () {
    const controller = this.colony.controller
    const closestCity = this.getClosestCity(this.data.colony)
    const upgraders = new qlib.Cluster('upgraders_' + this.data.colony, closestCity)
    if (!this.data.deathwatch) {
      upgraders.sizeCluster('upgrader', 2)
    }
    upgraders.forEach(function (upgrader) {
      if (upgrader.room.name !== controller.room.name) {
        upgrader.travelTo(controller)
        return
      }
      if (upgrader.recharge()) {
        return
      }
      const distance = upgrader.pos.getRangeTo(controller)
      if (distance > 2) {
        upgrader.travelTo(controller)
      }
      if (distance < 3) {
        upgrader.upgradeController(controller)
      }
    })
  }
}

module.exports = EmpireExpand
