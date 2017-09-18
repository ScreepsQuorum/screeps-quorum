'use strict';

/**
 * Top level program- it is responsible for launching everything else.
 */

class Player extends kernel.process {
  constructor(...args) {
    super(...args)
    this.priority = PRIORITIES_PLAYER
  }

  main() {
    this.launchChildProcess('respawner', 'respawner');

    let roomname;
    for (roomname of Object.keys(Game.rooms)) {
      /* Launch a "City" program for any room owned by this player */
      if (Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        this.launchChildProcess(`room_${roomname}`, 'city', {
          'room': roomname,
        });
      }
    }
  }
}

module.exports = Player;
