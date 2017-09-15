Object.defineProperty(Room.prototype, 'structures', {
  get: function() { 
    if(!this._structures || _.isEmpty(this._structures)) {
      this._all_structures = this.find(FIND_STRUCTURES)
      this._structures = _.groupBy(this._all_structures, 'structureType');
      this._structures.all = this._all_structures
    }
    return this._structures;
  },
  enumerable: false,
  configurable: true
});
