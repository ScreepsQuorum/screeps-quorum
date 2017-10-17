'use strict'

const MetaRole = require('roles_meta')

class Claimer extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 850
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([MOVE, CLAIM, MOVE, MOVE, MOVE, MOVE], options.energy)
  }
}

module.exports = Claimer
