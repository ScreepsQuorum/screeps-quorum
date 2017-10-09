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

    Logger.highlight(this.data.colony)

    // Don't continue futher until the room is claimed
    if (!this.colony.controller.my) {
      Logger.highlight('Claiming Room')
      this.claim()
      return
    }
    Logger.highlight('Room Claimed')

    return
    /*
    this.upgrade()
    this.mine()

    // Destroy all neutral and hostile structures immediately
    if (!this.data.hascleared) {
      return
    }

    // If the room isn't planned launch the room layout program, otherwise launch construction program
    this.build()
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
      if (Game.time - this.data.deathwatch > 1600) {
        this.suicide()
      }
    }
    */
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
    Logger.highlightData(scores)
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
    Logger.highlight('starting claim')
    const controller = this.colony.controller
    if (this.colony.controller.my) {
      return
    }
    Logger.highlight('making cluster')
    const closestCity = this.getClosestCity(this.data.colony)
    const claimer = new qlib.Cluster('claimers_' + this.data.colony, closestCity)

    // Give up 1000 ticks after launching the last claimer and move on to the next candidate room.
    /*
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
    */
    claimer.sizeCluster('claimer', 1)
    claimer.forEach(function (claimer) {
      Logger.highlight(claimer.room.name)
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
      if (source.energy > 0) {
        miner.harvest(source)
        return
      }
      if (miner.carry[RESOURCE_ENERGY] <= 0) {
        return
      }
      if (construction) {
        miner.build(construction)
      } else if (container && container.hits < container.hitsMax) {
        miner.repair(container)
      }
    })
  }

  build () {
    const controller = this.colony.controller
    const closestCity = this.getClosestCity(this.data.colony)
    const builders = new qlib.Cluster('builers_' + this.data.colony, closestCity)
    const constructionSites = this.colony.find(FIND_MY_CONSTRUCTION_SITES)
    const site = constructionSites.length > 0 ? constructionSites[0] : false
    if (!this.data.deathwatch) {
      builders.sizeCluster('builder', 2)
    }
    builders.forEach(function (builder) {
      if (!builder.room.name !== controller.room.name) {
        builder.travelTo(controller)
        return
      }
      if (builder.recharge()) {
        return
      }

      // If there's a construction site buildit
      if (site) {
        const siteDistance = builder.getRangeTo(site)
        if (siteDistance > 2) {
          builder.travelTo(site)
        }
        if (siteDistance <= 3) {
          builder.build(site)
        }
        return
      }

      // As a last resort upgrade controller
      const controllerDistance = builder.getRangeTo(controller)
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
      if (!upgrader.room.name !== controller.room.name) {
        upgrader.travelTo(controller)
        return
      }
      if (upgrader.recharge()) {
        return
      }
      const distance = upgrader.getRangeTo(controller)
      if (distance < 2) {
        upgrader.travelTo(controller)
      }
      if (distance < 3) {
        upgrader.upgradeController(controller)
      }
    })
  }
}

module.exports = EmpireExpand
