'use strict'

const MetaRole = require('roles_meta')

class Filler extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 2200
    this.fillableStructures = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    let build = [MOVE, CARRY, WORK]
    if (options.carry_only) {
      build = [MOVE, CARRY]
    }
    return Creep.buildFromTemplate(build, options.energy)
  }

  manageCreep (creep) {
    if (creep.recharge()) {
      return
    }

    // Check to see if creep is already assigned a valid target and reuse.
    if (creep.memory.ft) {
      const cachedStructure = Game.getObjectById(creep.memory.ft)
      if (cachedStructure.energy < cachedStructure.energyCapacity) {
        this.fillStructure(creep, cachedStructure)
        return
      } else {
        delete creep.memory.ft
      }
    }

    // Find structure to fill
    const structure = creep.pos.findClosestByRange(creep.room.getStructuresToFill(this.fillableStructures))
    if (structure) {
      creep.memory.ft = structure.id
      this.fillStructure(creep, structure)
      return
    }

    // Park
    let target
    if (creep.room.storage) {
      target = creep.room.storage
    } else {
      const spawns = creep.room.find(FIND_MY_SPAWNS)
      target = spawns[0]
    }
    if (creep.pos.getRangeTo(target) > 3) {
      creep.travelTo(target)
    }
  }

  fillStructure (creep, structure) {
    if (creep.pos.isNearTo(structure)) {
      creep.transfer(structure, RESOURCE_ENERGY, Math.min(creep.carry[RESOURCE_ENERGY], structure.energyCapacity - structure.energy))
    } else {
      creep.travelTo(structure)
    }
  }
}

module.exports = Filler
