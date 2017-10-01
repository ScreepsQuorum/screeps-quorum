'use strict'

/**
 * Mine sources in local room, placing energy in storage.
 */

class CityMine extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CONSTRUCTION
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    this.sources = this.room.find(FIND_SOURCES)
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
        this.room.createConstructionSite(minerPos, STRUCTURE_CONTAINER)
      } else {
        construction = constructionSites[0]
      }
    }

    // Run miners.
    const miners = new qlib.Cluster('miners_' + source.id, this.room)
    miners.sizeCluster('miner', 1, {'priority': 2})
    miners.forEach(function (miner) {
      if (!miner.pos.isNearTo(source)) {
        miner.travelTo(minerPos)
        return
      }
      if (construction && miner.carry[RESOURCE_ENERGY]) {
        miner.build(construction)
        return
      }
      if (source.energy > 0) {
        miner.harvest(source)
      } else if (miner.carry[RESOURCE_ENERGY] && container && container.hits < container.hitsMax) {
        miner.repair(container)
      }
    })

    // If using containers spawn haulers
    if (!container || !this.room.storage) {
      return
    }

    const haulers = new qlib.Cluster('haulers_' + source.id, this.room)
    haulers.sizeCluster('hauler', 1)
    haulers.forEach(function (hauler) {
      if (hauler.ticksToLive < 50) {
        return hauler.recycle()
      }
      if (hauler.getCarryPercentage() > 0.8) {
        if (!hauler.pos.isNearTo(hauler.room.storage)) {
          hauler.travelTo(hauler.room.storage)
        }
        if (hauler.pos.isNearTo(hauler.room.storage)) {
          hauler.transfer(hauler.room.storage, RESOURCE_ENERGY)
        }
        return
      }
      if (!hauler.pos.isNearTo(container)) {
        hauler.travelTo(container)
      }
      if (hauler.pos.isNearTo(container)) {
        if (container.store[RESOURCE_ENERGY]) {
          hauler.withdraw(container, RESOURCE_ENERGY)
        }
      }
    })
  }
}

module.exports = CityMine
