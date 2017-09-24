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

  getPriority (creep) {
    return PRIORITIES_CREEP_DEFAULT
  }
}

module.exports = MetaRole
