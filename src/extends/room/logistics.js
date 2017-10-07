'use strict'

Room.prototype.getStructuresToFill = function (structureTypes) {
  if (!this.__fillable) {
    this.__fillable = this.find(FIND_MY_STRUCTURES, {
      filter: function (structure) {
        if (structureTypes.indexOf(structure.structureType) === -1) {
          return false
        }
        if (!structure.energyCapacity) {
          return false
        }
        return structure.energy < structure.energyCapacity
      }
    })
  }
  return this.__fillable
}
