'use strict'

StructureLab.prototype.canFill = function () {
  return !this.mineralAmount || this.mineralAmount < this.mineralCapacity
}
