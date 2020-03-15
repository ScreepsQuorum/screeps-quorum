'use strict'

/**
 * This program detects when the game has no spawns or creeps and unclaims atll rooms, triggering a respawn.
 */

class Respawn extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_RESPAWNER
  }

  main () {
    // As long as there are active spawns or creeps do not respawn
    if (Object.keys(Game.spawns).length > 0 || Object.keys(Game.creeps).length > 0) {
      return
    }
    Logger.log('Dead code detected, initiating despawn', LOG_FATAL)

    /* Check all rooms for player owned controllers and unclaim them */
    let roomname
    for (roomname of Object.keys(Game.rooms)) {
      if (Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        Logger.log(`Unclaiming room ${roomname}`)
        Game.rooms[roomname].controller.unclaim()
      }
    }
    /* Remove all construction sites */
    for (const siteId of Object.keys(Game.constructionSites)) {
      Game.constructionSites[siteId].remove()
    }
  }
}

module.exports = Respawn
