'use strict'

const MetaRole = require('roles_meta')

class Miner extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 950
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    let base
    if (options.remote) {
      base = [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, WORK]
      if (options.energy >= 950) {
        return base
      }
    } else {
      base = [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE]
      if (options.energy >= 800) {
        return base
      }
    }

    return Creep.buildFromTemplate(base, options.energy)
  }
}

module.exports = Miner
