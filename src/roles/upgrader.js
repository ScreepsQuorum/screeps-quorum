'use strict';

const MetaRole = require('roles_meta');

const CONTROLLER_MESSAGE = '* Self Managed Code * quorum.tedivm.com * #quorum in Slack *';

class Upgrader extends MetaRole {
  getBuild(room, options) {
    this.setBuildDefaults(room, options);
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy);
  }

  getPriority(creep) {
    return PRIORITIES_CREEP_UPGRADER
  }

  manageCreep(creep) {
    if (this.recharge(creep)) {
      return;
    }

    if (!creep.room.controller.sign || creep.room.controller.sign.text !== CONTROLLER_MESSAGE) {
      if (!creep.pos.inRangeTo(creep.room.controller, 1)) {
        creep.moveTo(creep.room.controller);
      }
      if (creep.pos.inRangeTo(creep.room.controller, 3)) {
        creep.signController(creep.room.controller, CONTROLLER_MESSAGE);
      }
    } else {
      if (!creep.pos.inRangeTo(creep.room.controller, 2)) {
        creep.moveTo(creep.room.controller);
      }
    }

    if (creep.pos.inRangeTo(creep.room.controller, 3)) {
      creep.upgradeController(creep.room.controller);
    }
  }
}

module.exports = Upgrader;
