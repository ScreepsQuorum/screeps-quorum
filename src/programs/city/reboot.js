'use strict'

/**
 * Attempts to prevent stalled rooms by launching filler creeps at 300 energy.
 */

class CityReboot extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CITY_REBOOT
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]
    const fillers = this.room.find(FIND_MY_CREEPS, { filter: (creep) => creep.name.startsWith('filler') })
    if (fillers.length <= 0) {
      this.launchCreepProcess('rebooter', 'filler', this.data.room, 2, {
        priority: 1,
        energy: 300
      })
    }
  }
}

module.exports = CityReboot
