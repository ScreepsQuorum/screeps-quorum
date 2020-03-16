'use strict'

/**
 * This program handles expanding into new rooms, specifically:
 *
 * - Identifies potential rooms to expand to.
 * - Attempts to claim a room and if it fails, falls back to the next ideal room.
 * - Builds up a new room to be self sufficient.
 * - Rebuilds existing rooms which have gotten knocked down.
 * - Figures out which rooms in the empire are most able to help and utilizes them.
 */

const VERSION = 1.2

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
    Logger.log(`expansion: ${this.getDescriptor()}`)

    // Restart program (if it hasn't gone to far) so that the best candidate gets picked.
    if (!this.data.version || this.data.version !== VERSION) {
      if (this.data.colony || this.data.candidates || this.data.candidateList) {
        if (!Game.rooms[this.data.colony] || !Game.rooms[this.data.colony].controller.my) {
          this.suicide()
        } else {
          // Reset some variables but don't restart the program.
          this.data.claimedAt = Game.time
        }
      }
    }
    this.data.version = VERSION

    if (!this.data.colony && !this.data.recover) {
      const candidate = this.getNextCandidate()
      if (candidate && this.validateRoom(candidate)) {
        this.data.colony = candidate
        this.data.attemptedClaim = 0
        this.data.lastClaimAttempt = false
        delete this.data.deathwatch
      }
      return
    }
    if (!this.getClosestCity(this.data.colony)) {
      return
    }

    if (Game.rooms[this.data.colony]) {
      this.colony = Game.rooms[this.data.colony]
    }

    if (!Game.rooms[this.data.colony] || !Game.rooms[this.data.colony].controller.my) {
      // If we're trying to recover a destroyed room and the controller times out just give up.
      if (this.data.recover) {
        this.suicide()
        return
      }

      // Use observers if any are available.
      StructureObserver.monitor(this.data.colony)

      // Send scouts if there is no visibility. This may overlap with observers, but will also cover rooms on the way.
      this.scout()

      // Don't continue futher until the room is claimed
      this.claim()
      return
    }

    // First run after claiming- record tick and launch layout process
    if (!this.data.claimedAt) {
      if (!this.colony.getLayout().isPlanned()) {
        this.launchChildProcess('layout', 'city_layout', {
          room: this.data.colony
        })
      }
      this.data.claimedAt = Game.time
    }

    // If layout isn't complete after a full generation unclaim and try again somewhere else.
    if (!this.data.recover && Game.time - this.data.claimedAt > CREEP_LIFE_TIME) {
      if (!this.colony.getLayout().isPlanned() && !this.isChildProcessRunning('layout')) {
        this.colony.controller.unclaim()
        delete this.data.claimedAt
        delete this.data.colony
        return
      }
    }

    this.upgrade()

    const sources = this.colony.find(FIND_SOURCES)
    for (const source of sources) {
      this.mine(source)
    }

    this.hostileSpawns = this.colony.find(FIND_HOSTILE_SPAWNS)
    this.build()

    if (this.hostileSpawns.length > 0) {
      return
    }

    // If the room layout is planned launch the construction program
    if (!this.data.recover && this.colony.getLayout().isPlanned()) {
      this.launchChildProcess('construct', 'city_construct', {
        room: this.data.colony
      })
    }

    if (this.colony.getRoomSetting('SELF_SUFFICIENT')) {
      if (!this.data.recover && !Room.isCity(this.data.colony)) {
        Room.addCity(this.data.colony)
      }
      if (this.colony.storage) {
        if (!this.data.deathwatch) {
          this.data.deathwatch = Game.time
        }
        if (Game.time - this.data.deathwatch > 1800) {
          this.suicide()
        }
      }
    }
  }

  getNextCandidate () {
    // If a candidate list already exists use the best scoring candidate from the list.
    if (this.data.candidates) {
      if (this.data.candidates.length > 0) {
        return this.data.candidates.pop()
      } else {
        // If all candidates have been invalidated clear data and try again
        delete this.data.candidates
        delete this.data.candidateList
      }
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
    for (const city of cities) {
      if (!Game.rooms[city]) {
        continue
      }
      if (!Game.rooms[city].getRoomSetting('EXPAND_FROM')) {
        continue
      }
      const testDistance = Room.getManhattanDistance(city, roomName)
      if (distance > testDistance) {
        closest = city
        distance = testDistance
      }
    }
    return closest ? Game.rooms[closest] : false
  }

  getCandidateList () {
    const cities = Room.getCities()
    const candidates = []

    for (const city of cities) {
      if (!Game.rooms[city]) {
        continue
      }
      const room = Game.rooms[city]
      if (!room.getRoomSetting('EXPAND_FROM') || !room.isEconomyCapable('EXPAND_FROM')) {
        continue
      }

      const rooms = Room.getRoomsInRange(city, 10)
      for (const room of rooms) {
        if (candidates.indexOf(room) >= 0 || !Room.isClaimable(room)) {
          continue
        }
        if (Room.getManhattanDistance(city, room) <= 8) {
          candidates.push(room)
        }
      }
    }
    return candidates
  }

  scout () {
    const closestCity = this.getClosestCity(this.data.colony)
    const center = new RoomPosition(25, 25, this.data.colony)
    const scouts = this.getCluster('scout', closestCity)
    if (!Game.rooms[this.data.colony] || !Game.rooms[this.data.colony].controller.my) {
      const creeps = scouts.getCreeps()
      const quantity = creeps.length === 1 && creeps[0].ticksToLive < 750 ? 2 : 1
      scouts.sizeCluster('spook', quantity, { priority: 2 })
    }
    scouts.forEach(function (scout) {
      if (scout.room.name === center.roomName) {
        if (scout.pos.getRangeTo(center) <= 20) {
          return
        }
      }
      scout.travelTo(center, { range: 20 })
    })
  }

  claim () {
    let controller = false
    if (this.colony) {
      if (this.colony.controller.my) {
        return
      }
      controller = this.colony.controller
    }
    const closestCity = this.getClosestCity(this.data.colony)
    const claimer = this.getCluster('claimers', closestCity)

    // Give up 1000 ticks after launching the last claimer and move on to the next candidate room.

    if (this.data.attemptedClaim < 3) {
      if (!this.data.lastClaimAttempt || Game.time - this.data.lastClaimAttempt > 1000) {
        this.data.attemptedClaim++
        this.data.lastClaimAttempt = Game.time
        claimer.sizeCluster('claimer', 1, { priority: 2 })
      }
    } else if (Game.time - this.data.lastClaimAttempt > 1000) {
      if (claimer.getCreeps().length < 1) {
        delete this.data.colony
        return
      }
    }
    const colonyName = this.data.colony
    claimer.forEach(function (claimer) {
      if (!controller) {
        const pos = new RoomPosition(25, 25, colonyName)
        claimer.travelTo(pos, { range: 20 })
        return
      }
      if (!claimer.pos.isNearTo(controller)) {
        claimer.travelTo(controller)
      } else if (!controller.my) {
        claimer.claimController(controller)
      }
    })
  }

  mine (source) {
    const spawnRoom = this.colony.energyCapacityAvailable >= 800 ? this.colony : this.getClosestCity(this.data.colony)

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

    const miners = this.getCluster(`miner_${source.id}`, spawnRoom)
    if (!this.data.deathwatch && !this.colony.getRoomSetting('SELF_SUFFICIENT')) {
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
    const builders = this.getCluster('builders', closestCity)
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
        const structures = builder.room.find(FIND_MY_STRUCTURES, {
          filter: function (structure) {
            if (structure.structureType !== STRUCTURE_EXTENSION && structure.structureType !== STRUCTURE_SPAWN) {
              return false
            }
            return structure.energyCapacity && structure.energy < structure.energyCapacity
          }
        })
        const structure = builder.pos.findClosestByRange(structures)

        if (!builder.pos.isNearTo(structure)) {
          builder.travelTo(structure)
        } else {
          builder.transfer(structure, RESOURCE_ENERGY)
        }
        return
      }

      // If there's a construction site build it
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
    const upgraders = this.getCluster('upgraders', closestCity)
    if (!this.data.deathwatch) {
      let quantity = 2
      if (this.data.recover) {
        quantity = this.colony.controller.isTimingOut() ? 1 : 0
      }
      upgraders.sizeCluster('upgrader', quantity)
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
