'use strict'

const MetaRole = require('roles_meta')

let CONTROLLER_MESSAGE
if (PUBLIC_ACCOUNT) {
  CONTROLLER_MESSAGE = 'Self Managed Code * quorum.tedivm.com * github.com/ScreepsQuorum/screeps-quorum * #quorum in Slack'
} else {
  CONTROLLER_MESSAGE = 'Fully Autonomous Open Source Bot * github.com/ScreepsQuorum/screeps-quorum * #quorum in Slack'
}

class Upgrader extends MetaRole {
  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy)
  }

  getPriority (creep) {
    return PRIORITIES_CREEP_UPGRADER
  }

  manageCreep (creep) {
    const link = creep.room.controller.getLink()
    if (creep.carry[RESOURCE_ENERGY] / creep.carryCapacity < 0.5) {
      if (link && link.energy > 0 && creep.pos.isNearTo(link)) {
        creep.withdraw(link, RESOURCE_ENERGY)
      }
    }
    if (creep.recharge()) {
      return
    }

    if (!creep.room.controller.sign || creep.room.controller.sign.text !== CONTROLLER_MESSAGE) {
      if (!creep.pos.isNearTo(creep.room.controller)) {
        creep.travelTo(creep.room.controller)
      } else {
        creep.signController(creep.room.controller, CONTROLLER_MESSAGE)
      }
    } else {
      if (link) {
        if (!creep.pos.isNearTo(link)) {
          creep.travelTo(link)
        }
      } else if (!creep.pos.inRangeTo(creep.room.controller, 2)) {
        creep.travelTo(creep.room.controller)
      }
    }

    if (creep.pos.inRangeTo(creep.room.controller, 3)) {
      creep.upgradeController(creep.room.controller)
    }
  }
}

module.exports = Upgrader
