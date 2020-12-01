'use strict'

const MetaRole = require('roles_meta')

class Dismantler extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 1200
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([WORK, MOVE, CARRY], options.energy)
  }
}

module.exports = Dismantler
