'use strict'

const FILLABLE_STRUCTURES = [
  STRUCTURE_SPAWN,
  STRUCTURE_EXTENSION,
  STRUCTURE_TOWER
]

Room.prototype.getStructuresToFill = function () {
  if (!this.__fillable) {
    this.__fillable = this.find(FIND_MY_STRUCTURES, {filter: function (structure) {
      if (FILLABLE_STRUCTURES.indexOf(structure.structureType) === -1) {
        return false
      }

      return structure.energy < structure.energyCapacity
    }})
  }
  return this.__fillable
}
