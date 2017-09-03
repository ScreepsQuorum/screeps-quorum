/**
 * Top level program- it is responsible for launching everything else.
 */

class Player extends kernel.process {
  main () {
    for (var roomname of Object.keys(Game.rooms)) {

      /* Launch a "City" program for any room owned by this player */
      if(Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        this.launchChildProcess('room_' + roomname, 'city', {'room': roomname})
      }
    }
  }
}

module.exports = Player
