'use strict'

class QosStats {
  constructor () {
    Memory.stats = Memory.stats || {}
    Memory.stats.game = Memory.stats.game || {}
  }
  gameStat (name, value) {
    Memory.stats.game[name] = value
  }
}

module.exports = QosStats
