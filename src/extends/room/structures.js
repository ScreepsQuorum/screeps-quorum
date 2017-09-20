'use strict'

Object.defineProperty(Room.prototype, 'structures', {
  get: function () {
    if (!this._structures || _.isEmpty(this._structures)) {
      const allStructures = this.find(FIND_STRUCTURES)
      this._structures = _.groupBy(allStructures, 'structureType')
      this._structures.all = allStructures
    }
    return this._structures
  },
  enumerable: false,
  configurable: true
})
