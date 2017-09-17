'use strict';

const Filler = require('roles_filler');

class Replenisher extends Filler {
  constructor() {
    super();
    this.fillableStructures = [STRUCTURE_TOWER];
  }
}

module.exports = Replenisher;
