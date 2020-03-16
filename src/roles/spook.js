'use strict'

const MetaRole = require('roles_meta')
let CONTROLLER_MESSAGE
if (PUBLIC_ACCOUNT) {
  CONTROLLER_MESSAGE = 'Self Managed Code * quorum.tedivm.com * github.com/ScreepsQuorum/screeps-quorum * #quorum in Slack'
} else {
  CONTROLLER_MESSAGE = 'Fully Autonomous Open Source Bot * github.com/ScreepsQuorum/screeps-quorum * #quorum in Slack'
}

class Spook extends MetaRole {
  getPriority (creep) {
    return PRIORITIES_CREEP_SPOOK
  }

  getBuild (room, options) {
    return [MOVE]
  }

  manageCreep (creep) {
    // Disable notifications of attack since this creep will head into hostile rooms.
    if (!creep.memory.dn) {
      creep.memory.dn = true
      creep.notifyWhenAttacked(false)
    }

    // Delete current target if it is currently visible.
    if (creep.memory.starget && Game.rooms[creep.memory.starget]) {
      if (Memory.intel.active[creep.name]) {
        delete Memory.intel.active[creep.name]
      }
      delete creep.memory.starget
    }

    // Harass current room by signing controller and stomping contruction sites.
    if (!creep.room.controller || !creep.room.controller.my) {
      if (!creep.memory.stomproom || creep.memory.stomproom !== creep.room.name) {
        creep.memory.stomproom = creep.room.name
        creep.memory.stomptime = Game.time
      }

      if (Game.time - creep.memory.stomptime < 70) {
        // Find and destroy any hostile construction sites
        if (this.stompConstruction(creep)) {
          return
        }
        // Tag the controller
        if (this.signController(creep)) {
          return
        }
      }
    }

    // Move on to the next room
    this.migrateRooms(creep)
  }

  stompConstruction (creep) {
    // Use cached construction site
    if (creep.memory.stomp) {
      const construction = Game.getObjectById(creep.memory.stomp)
      if (construction) {
        creep.travelTo(construction)
        return true
      } else {
        delete creep.memory.stomp
      }
    }
    // Find a new site to stomp, excluding any being stood on.
    const construction = creep.pos.findClosestByRange(FIND_HOSTILE_CONSTRUCTION_SITES, {
      filter: function (site) {
        return site.pos.getRangeTo(creep) > 0
      }
    })
    if (!construction) {
      return false
    }
    creep.memory.stomp = construction.id
    creep.travelTo(construction)
    return true
  }

  signController (creep) {
    // Cannot sign SK or highway rooms
    if (!creep.room.controller) {
      return false
    }
    // Already Signed
    if (creep.room.controller.sign && creep.room.controller.sign.username === USERNAME) {
      return false
    }
    // Not ours (reserved)
    if (creep.room.controller.reservation && creep.room.controller.reservation.username !== USERNAME) {
      return false
    }
    // Not ours (owned)
    if (creep.room.controller.owner && creep.room.controller.owner.username !== USERNAME) {
      return false
    }
    // Signed too recently
    if (creep.room.controller.sign && Game.time - creep.room.controller.sign.time > CONTROLLER_RESIGN_COOLDOWN) {
      return false
    }
    if (creep.pos.isNearTo(creep.room.controller)) {
      creep.signController(creep.room.controller, CONTROLLER_MESSAGE)
    } else {
      creep.travelTo(creep.room.controller)
    }
    return true
  }

  migrateRooms (creep) {
    let target
    if (creep.memory.starget && creep.memory.starget !== creep.room.name) {
      target = creep.memory.starget
    } else {
      target = Room.getScoutTarget(creep)
      creep.memory.starget = target
    }
    const ret = creep.travelTo(new RoomPosition(25, 25, target), {
      range: 23,
      ignoreHostileCities: false
    })
    if (ret === ERR_NO_PATH) {
      delete creep.memory.starget
    }
  }
}

module.exports = Spook
