'use strict'

const MetaRole = require('roles_meta')

class Fracker extends MetaRole {
  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    // 10 per harvest * 0.2 harvests per tick = 2 mineral per tick
    // 25 ticks to fill
    // 10 ticks fatigue per move - 20 distance (estimated) == 220 ticks (without roads)
    // 1280 ticks == 2560 minerals per 12 parts
    // Extra move at 50 parts reduces fatigue to 7 ticks.
    const base = [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
    return Creep.buildFromTemplate(base, options.energy)
  }
}

module.exports = Fracker
