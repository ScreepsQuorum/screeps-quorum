
const CONTROLLER_MESSAGE = "* Self Managed Code * quorum.tedivm.com * #quorum in Slack *"

class Upgrader {
  getBuild (options) {
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy)
  }

  manageCreep (creep) {
    if (creep.carry[RESOURCE_ENERGY] <= 0) {
      creep.memory.recharge = true
    }
    if (creep.carry[RESOURCE_ENERGY] >= creep.carryCapacity) {
      creep.memory.recharge = false
    }
    if (creep.memory.recharge) {
      var sources = creep.room.find(FIND_SOURCES_ACTIVE)
      var source = creep.pos.findClosestByRange(sources)
      if (!creep.pos.isNearTo(source)) {
        creep.moveTo(source)
      }
      if (creep.pos.isNearTo(source)) {
        creep.harvest(source)
      }
      return
    }

    if (!creep.room.controller.sign || creep.room.controller.sign.text !== CONTROLLER_MESSAGE) {
      if (!creep.pos.inRangeTo(creep.room.controller, 1)) {
        creep.moveTo(creep.room.controller)
      }
      if (creep.pos.inRangeTo(creep.room.controller, 3)) {
        creep.signController(creep.room.controller, CONTROLLER_MESSAGE)
      }
    } else {
      if (!creep.pos.inRangeTo(creep.room.controller, 2)) {
        creep.moveTo(creep.room.controller)
      }
    }

    if (creep.pos.inRangeTo(creep.room.controller, 3)) {
      creep.upgradeController(creep.room.controller)
    }
  }
}

module.exports = Upgrader
