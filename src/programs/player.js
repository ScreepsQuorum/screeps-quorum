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
    if (!qlib.events.hasEventHappened('epoch')) {
      qlib.events.recordEvent('epoch')
    }
    const empireAge = qlib.events.getTimeSinceEvent('epoch')

    if (!this.data.gcl) {
      this.data.gcl = Game.gcl.level
    }
    if (this.data.gcl < Game.gcl.level) {
      qlib.notify.send(`GCL has increased to ${Game.gcl.level}`)
      this.data.gcl = Game.gcl.level
    }

    this.launchChildProcess('respawner', 'respawner')
    this.launchChildProcess('intel', 'empire_intel')
    this.launchChildProcess('observers', 'empire_observers')
    this.launchChildProcess('market', 'empire_market')
    this.launchChildProcess('maintenance', 'meta_maintenance')

    const cities = Room.getCities()
    let roomname
    for (roomname of cities) {
      /* Launch a "City" program for each city saved in memory. `Room.addCity` to add new rooms. */
      if (Game.rooms[roomname] && Game.rooms[roomname].controller && Game.rooms[roomname].controller.my) {
        this.launchChildProcess(`room_${roomname}`, 'city', {
          room: roomname
        })
      }
    }

    for (const priority of MONITOR_PRIORITIES) {
      this.launchChildProcess(`pmonitor_${priority}`, 'meta_monitor', {
        priority: priority
      })
    }

    if (qlib.events.getTimeSinceEvent('epoch') < 3000) {
      return
    }

    const lastAdd = qlib.events.getTimeSinceEvent('addcity')
    if (empireAge > 10000 && lastAdd > 2000) {
      const defaultPriorityStats = sos.lib.monitor.getPriorityRunStats(PRIORITIES_CREEP_DEFAULT)
      if (defaultPriorityStats && defaultPriorityStats.long <= 1.25) {
        if (cities.length < Game.gcl.level) {
          if (cities.length > 1 || (Game.rooms[cities[0]] && Game.rooms[cities[0]].getRoomSetting('EXPAND_FROM'))) {
            this.launchChildProcess('expand', 'empire_expand')
          }
        }
      }
    }
  }
}

module.exports = Player
