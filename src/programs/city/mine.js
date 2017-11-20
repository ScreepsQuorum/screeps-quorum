'use strict'

/**
 * Mine sources in local room, placing energy in storage.
 */

class CityMine extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CONSTRUCTION
  }

  getDescriptor () {
    if (this.data.mine) {
      return `${this.data.room} to ${this.data.mine}`
    } else {
      return this.data.room
    }
  }

  getPerformanceDescriptor () {
    if (this.data.mine) {
      return 'remote'
    }
    return false
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    if (this.data.mine && this.data.mine !== this.data.room) {
      // If main room can not support mines kill this program.
      if (this.room.getRoomSetting('REMOTE_MINES') <= 0) {
        return this.suicide()
      }
      this.remote = true
      this.scout()
      if (!Game.rooms[this.data.mine]) {
        return
      }
      this.mine = Game.rooms[this.data.mine]
      this.underAttack = this.mine.find(FIND_HOSTILE_CREEPS).length > 0
      this.reserveRoom()
      if (this.room.getEconomyLevel() >= ECONOMY_BURSTING) {
        this.strictSpawning = this.room.getRoomSetting('ALLOW_MINING_SCALEBACK')
      }
    } else {
      this.mine = this.room
    }

    this.sources = this.mine.find(FIND_SOURCES)
    let source
    for (source of this.sources) {
      this.mineSource(source)
    }
  }

  mineSource (source) {
    // Identify where the miner should sit and any container should be built
    const minerPos = source.getMiningPosition()

    // Look for a container
    const containers = _.filter(minerPos.lookFor(LOOK_STRUCTURES), (a) => a.structureType === STRUCTURE_CONTAINER)
    const container = containers.length > 0 ? containers[0] : false

    // Build container if it isn't there
    let construction = false
    if (!container) {
      const constructionSites = minerPos.lookFor(LOOK_CONSTRUCTION_SITES)
      if (constructionSites.length <= 0) {
        this.mine.createConstructionSite(minerPos, STRUCTURE_CONTAINER)
      } else {
        construction = constructionSites[0]
      }
    }

    // Run miners.
    const miners = this.getCluster(`miners_${source.id}`, this.room)

    // Check if a replacement miner is needed and spawn it early
    const minerCreeps = miners.getCreeps()
    let minerQuantity = 1
    if (miners.getClusterSize() === 1 && minerCreeps.length > 0 && minerCreeps[0].ticksToLive < 60) {
      minerQuantity = 2
    }
    if (this.underAttack || this.strictSpawning) {
      minerQuantity = 0
    }

    miners.sizeCluster('miner', minerQuantity, {'priority': 2})
    miners.forEach(function (miner) {
      if (miner.pos.getRangeTo(minerPos) !== 0) {
        miner.travelTo(minerPos)
        return
      }

      let needsRepairs = container && container.hits < container.hitsMax

      if (construction && miner.carry[RESOURCE_ENERGY]) {
        miner.build(construction)
        return
      }
      if (needsRepairs && miner.carry[RESOURCE_ENERGY] > 0) {
        miner.repair(container)
      } else if (source.energy > 0) {
        miner.harvest(source)
      }
    })

    let storage = false
    if (this.room.storage) {
      storage = this.room.storage
    } else if (this.room.terminal) {
      storage = this.room.terminal
    } else if (this.remote) {
      const containers = this.room.structures[STRUCTURE_CONTAINER]

      if (containers && containers.length > 0) {
        if (containers.length > 1) {
          containers.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY])
        }
        storage = containers[0]
      } else {
        const spawns = this.room.structures[STRUCTURE_SPAWN]
        if (spawns) {
          if (spawns.length > 1) {
            spawns.sort((a, b) => a.energy - b.energy)
          }
          storage = spawns[0]
        }
      }
    }

    // If using containers spawn haulers
    if (!container || !storage) {
      return
    }

    const haulers = this.getCluster(`haulers_${source.id}`, this.room)
    if (!this.data.ssp) {
      this.data.ssp = {}
    }
    if (!this.data.ssp[source.id]) {
      if (this.room.storage) {
        this.data.ssp[source.id] = this.room.findPath(this.room.storage.pos, source.pos, {
          ignoreCreeps: true,
          maxOps: 6000
        }).length
      }
    }
    const distance = this.data.ssp[source.id] ? this.data.ssp[source.id] : 80
    if (!this.underAttack && !this.strictSpawning) {
      const carryCost = BODYPART_COST['move'] + BODYPART_COST['carry']
      const multiplier = this.remote ? 1.8 : 1.3
      const carryAmount = Math.ceil(((distance * multiplier) * 20) / carryCost) * carryCost
      const maxEnergy = Math.min(carryCost * (MAX_CREEP_SIZE / 2), this.room.energyCapacityAvailable)
      let energy = (carryAmount / CARRY_CAPACITY) * carryCost // 50 carry == 1m1c == 100 energy
      let quantity = 1
      if (energy > maxEnergy) {
        quantity = 2
        energy = Math.ceil((energy / 2) / carryCost) * carryCost
      }

      const respawnTime = ((energy / carryCost) * 2) * CREEP_SPAWN_TIME
      const respawnAge = respawnTime + (distance * 1.2)
      haulers.sizeCluster('hauler', quantity, {'energy': energy, 'respawnAge': respawnAge})
    }

    haulers.forEach(function (hauler) {
      if (hauler.ticksToLive < (distance + 30)) {
        return hauler.recycle()
      }
      if (hauler.getCarryPercentage() > 0.8) {
        if (!hauler.pos.isNearTo(storage)) {
          hauler.travelTo(storage)
        } else {
          hauler.transferAll(storage, RESOURCE_ENERGY)
        }
        return
      }
      if (!hauler.pos.isNearTo(container)) {
        hauler.travelTo(container)
      }
      if (hauler.pos.isNearTo(container)) {
        const localResources = hauler.pos.lookAroundFor(LOOK_RESOURCES)
        if (localResources.length > 0) {
          hauler.pickup(localResources[0].resource)
          return
        }
        if (container.store[RESOURCE_ENERGY]) {
          hauler.withdraw(container, RESOURCE_ENERGY)
        }
      }
    })
  }

  scout () {
    const center = new RoomPosition(25, 25, this.data.mine)
    const quantity = Game.rooms[this.data.mine] ? 0 : 1
    const scouts = this.getCluster(`scout`, this.room)
    scouts.sizeCluster('spook', quantity)
    scouts.forEach(function (scout) {
      if (scout.room.name === center.roomName) {
        if (scout.pos.getRangeTo(center) <= 20) {
          return
        }
      }
      scout.travelTo(center, {range: 20})
    })
  }

  reserveRoom () {
    if (this.underAttack) {
      return
    }
    const controller = this.mine.controller
    const timeout = controller.reservation ? controller.reservation.ticksToEnd : 0
    let quantity = 0
    if (timeout < 3500) {
      quantity = Math.min(this.room.getRoomSetting('RESERVER_COUNT'), controller.pos.getSteppableAdjacent().length)
    }

    const reservists = this.getCluster(`reservists`, this.room)
    reservists.sizeCluster('reservist', quantity)
    reservists.forEach(function (reservist) {
      if (!reservist.pos.isNearTo(controller)) {
        reservist.travelTo(controller)
      } else if (!controller.reservation || timeout < (CONTROLLER_RESERVE_MAX - 5)) {
        reservist.reserveController(controller)
      }
    })
  }
}

module.exports = CityMine
