'use strict'

const MetaRole = require('roles_meta')

class Reservist extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 3250
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    return Creep.buildFromTemplate([MOVE, CLAIM], options.energy)
  }
}

module.exports = Reservist
