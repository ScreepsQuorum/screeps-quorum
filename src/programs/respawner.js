/**
 * This program detects when the game has no spawns or creeps and unclaims atll rooms, triggering a respawn.
 */

class Respawn extends kernel.process {

  priority () {
    return 12
  }

  main () {
    // As long as there are active spawns or creeps do not respawn
    if (Object.keys(Game.spawns).length > 0 || Object.keys(Game.creeps).length > 0) {
      return
    }
    Logger.log('Dead code detected, initiating despawn', LOG_FATAL)
    /* Check all rooms for player owned controllers and unclaim them */
    for (var roomname of Object.keys(Game.rooms)) {
      if (Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        Logger.log('Unclaiming room ' + roomname)
        Game.rooms[roomname].controller.unclaim()
      }
    }
  }
}

module.exports = Respawn
