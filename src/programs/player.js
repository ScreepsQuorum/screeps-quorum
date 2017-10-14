'use strict'

/**
 * Top level program- it is responsible for launching everything else.
 */

class Player extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_PLAYER
  }

  main () {
    this.launchChildProcess('respawner', 'respawner')
    this.launchChildProcess('intel', 'empire_intel')
    this.launchChildProcess('market', 'empire_market')

    const cities = Room.getCities()
    let roomname
    for (roomname of cities) {
      /* Launch a "City" program for each city saved in memory. `Room.addCity` to add new rooms. */
      if (Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        this.launchChildProcess(`room_${roomname}`, 'city', {
          'room': roomname
        })
      }
    }

    for (let priority of MONITOR_PRIORITIES) {
      this.launchChildProcess(`pmonitor_${priority}`, 'meta_monitor', {
        'priority': priority
      })
    }
  }
}

module.exports = Player
