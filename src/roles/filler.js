const MetaRole = require('roles_meta')

class Filler extends MetaRole {
  getBuild (options) {
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy)
  }

  manageCreep (creep) {
    if (this.recharge(creep)) {
      return
    }

    // Find structure to fill
    var structure = creep.pos.findClosestByRange(creep.room.getStructuresToFill())
    if (structure) {
      if (creep.pos.getRangeTo(structure) > 1) {
        creep.moveTo(structure)
      }
      if (creep.pos.getRangeTo(structure) <= 1) {
        creep.transfer(structure, RESOURCE_ENERGY)
      }
      return
    }

    // Park
    if (creep.room.storage) {
      var target = creep.room.storage
    } else {
      var spawns = creep.room.find(FIND_MY_SPAWNS)
      var target = spawns[0]
    }
    if (creep.pos.getRangeTo(target) > 3) {
      creep.moveTo(target)
    }

  }
}

module.exports = Filler
