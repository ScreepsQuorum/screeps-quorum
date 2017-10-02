'use strict'

const MetaRole = require('roles_meta')

class Builder extends MetaRole {
  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy)
  }

  manageCreep (creep) {
    if (creep.ticksToLive < 50) {
      return creep.recycle()
    }
    if (creep.recharge()) {
      return
    }

    // Find and build any construction sites
    const construction = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
    if (construction) {
      if (creep.pos.getRangeTo(construction) > 2) {
        creep.travelTo(construction)
      }
      if (creep.pos.getRangeTo(construction) <= 3) {
        creep.build(construction)
      }
      return
    }

    // Upgrade controller if there isn't anything to build
    const controller = creep.room.controller
    if (creep.pos.getRangeTo(controller) > 2) {
      creep.travelTo(controller)
    }
    if (creep.pos.getRangeTo(controller) <= 3) {
      creep.upgradeController(controller)
    }
  }
}

module.exports = Builder
