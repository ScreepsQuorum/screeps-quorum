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

    const monitorPriorities = _.uniq([
      PRIORITIES_CREEP_DEFAULT,
      PRIORITIES_DEFAULT
    ])
    for (let priority of monitorPriorities) {
      this.launchChildProcess(`pmonitor_${priority}`, 'meta_monitor', {
        'priority': priority
      })
    }

    const defaultPriorityStats = sos.lib.monitor.getPriorityRunStats(PRIORITIES_CREEP_DEFAULT)
    if (defaultPriorityStats && defaultPriorityStats['long'] <= 1.25) {
      if (cities.length < Game.gcl.level) {
        this.launchChildProcess('expand', 'empire_expand')
      }
    }
  }
}

module.exports = Player
