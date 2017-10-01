'use strict'

const MetaRole = require('roles_meta')

class Fracker extends MetaRole {
  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    // 10 per harvest * 0.166 harvests per tick = 1.66 mineral per tick
    // 10 ticks fatigue per move - 20 distance (estimated) == 220 ticks (without roads)
    // 1280 ticks == 2133 minerals per 12 parts
    // Extra move at 50 parts reduces fatigue to 7 ticks.
    const base = [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
    return Creep.buildFromTemplate(base, options.energy)
  }
}

module.exports = Fracker
