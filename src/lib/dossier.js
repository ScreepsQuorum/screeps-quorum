'use strict'

global.SEGMENT_DOSSIER = 'dossier'
sos.lib.vram.markCritical(SEGMENT_DOSSIER)

const PLAYER_RECENT_AGGRESSION = 'r'
const PLAYER_SCORE = 's'
const PLAYER_LAST_AGGRESSION = 'l'

const AGGRESSION_TIMEOUT = 1500

class Dossier {
  constructor () {
    let intel = sos.lib.vram.getData(SEGMENT_DOSSIER)
    if (Number.isInteger(intel)) {
      intel = false
    } else {
      if (!intel.users) {
        intel.users = {}
      }
    }
    this.intel = intel

    if (!Memory.dossier) {
      Memory.dossier = {
        buffer: {},
        lastsave: Game.time - 1
      }
    }
    this.intelbuffer = Memory.dossier.buffer
    const buffered = Object.keys(this.intelbuffer).length
    if (buffered > 0 && Game.time - Memory.dossier.lastsave >= 20) {
      this._flushIntel()
    }
  }

  recordAggression (player, room, type) {
    Logger.highlight(`Recording aggression by ${player} in ${room} of type ${type}`)
    if (!this.intel[player]) {
      this.intel[player] = {}
    }
    if (!this.intelbuffer[player]) {
      if (this.intel[player]) {
        this.intelbuffer[player] = this.intel[player]
      } else {
        this.intelbuffer[player] = {}
      }
    }

    const intel = this.intelbuffer[player]
    intel[PLAYER_LAST_AGGRESSION] = Game.time

    if (!intel[PLAYER_RECENT_AGGRESSION]) {
      intel[PLAYER_RECENT_AGGRESSION] = {}
    }
    if (intel[PLAYER_RECENT_AGGRESSION][room]) {
      if (Game.time - intel[PLAYER_RECENT_AGGRESSION][room].t < AGGRESSION_TIMEOUT) {
        const currentScore = AGGRESSION_SCORES[type]
        const existingScore = AGGRESSION_SCORES[intel[PLAYER_RECENT_AGGRESSION][room].a]
        if (existingScore < currentScore) {
          intel[PLAYER_SCORE] += currentScore - existingScore
          intel[PLAYER_RECENT_AGGRESSION][room].a = type
        }
        return
      }
    }
    intel[PLAYER_RECENT_AGGRESSION][room] = {
      t: Game.time,
      r: room,
      a: type
    }
    if (!intel[PLAYER_SCORE]) {
      intel[PLAYER_SCORE] = AGGRESSION_SCORES[type]
    } else {
      intel[PLAYER_SCORE] += AGGRESSION_SCORES[type]
    }
  }

  _getPlayerDetails (player) {
    if (this.intelbuffer[player]) {
      return this.intelbuffer[player]
    }
    if (this.intel[player]) {
      return this.intel[player]
    }
    return false
  }

  // Lower is better.
  getPlayerReputationScore (player) {
    // Segment not available
    if (!this.intel) {
      return false
    }
    // Player not available
    if (!this.intel[player]) {
      return 0
    }
    return this.intel[player][PLAYER_SCORE]
  }

  _flushIntel () {
    const players = Object.keys(this.intelbuffer)
    for (const player of players) {
      this.intel[player] = this.intelbuffer[player]
      delete this.intelbuffer[player]
    }
    Memory.dossier.lastsave = Game.time
    sos.lib.vram.markDirty(SEGMENT_DOSSIER)
  }
}

module.exports = Dossier
