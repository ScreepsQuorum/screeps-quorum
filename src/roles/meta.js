'use strict'

class MetaRole {
  setBuildDefaults (room, options) {
    if (!options.energy) {
      options.energy = this.defaultEnergy || room.energyCapacityAvailable
    }
    if (options.energy > room.energyCapacityAvailable) {
      options.energy = room.energyCapacityAvailable
    }
  }

  recharge (creep) {
    if (creep.carry[RESOURCE_ENERGY] <= 0) {
      creep.memory.recharge = true
    }
    if (creep.carry[RESOURCE_ENERGY] >= creep.carryCapacity) {
      creep.memory.recharge = false
    }
    if (creep.memory.recharge) {
      const sources = creep.room.find(FIND_SOURCES_ACTIVE)
      sources.sort((a, b) => a.pos.getRangeTo(a.room.controller) - b.pos.getRangeTo(b.room.controller))
      const idx = parseInt(creep.name[creep.name.length - 1], 36)
      const source = sources[idx % sources.length]
      if (!creep.pos.isNearTo(source)) {
        creep.moveTo(source)
      }
      if (creep.pos.isNearTo(source)) {
        creep.harvest(source)
      }
      return true
    }
    return false
  }

  getPriority (creep) {
    return PRIORITIES_CREEP_DEFAULT
  }
}

module.exports = MetaRole
