'use strict'

const Filler = require('roles_filler')

class Replenisher extends Filler {
  constructor() {
    super()
    this.defaultEnergy = 800
    this.fillableStructures = [STRUCTURE_TOWER]
  }

  getBuild(room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([MOVE, CARRY], options.energy)
  }
}

module.exports = Replenisher
