'use strict'

const MetaRole = require('roles_meta')

class Filler extends MetaRole {
  constructor() {
    super()
    this.fillableStructures = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
  }

  getBuild(options) {
    return Creep.buildFromTemplate([MOVE, CARRY, WORK], options.energy)
  }

  manageCreep(creep) {
    if (this.recharge(creep)) {
      return
    }

    // Find structure to fill
    let structure = creep.pos.findClosestByRange(creep.room.getStructuresToFill(this.fillableStructures))

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

    let target
    if (creep.room.storage) {
      target = creep.room.storage
    } else {
      let spawns = creep.room.find(FIND_MY_SPAWNS)
      target = spawns[0]
    }
    if (creep.pos.getRangeTo(target) > 3) {
      creep.moveTo(target)
    }
  }
}

module.exports = Filler
