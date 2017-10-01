'use strict'

class City extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CITY
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    this.launchChildProcess('spawns', 'spawns', {
      'room': this.data.room
    })
    this.launchChildProcess('defense', 'city_defense', {
      'room': this.data.room
    })
    this.launchChildProcess('reboot', 'city_reboot', {
      'room': this.data.room
    })

    // If the room isn't planned launch the room layout program, otherwise launch construction program
    if (!this.room.getLayout().isPlanned()) {
      this.launchChildProcess('layout', 'city_layout', {
        'room': this.data.room
      })
    } else {
      this.launchChildProcess('construct', 'city_construct', {
        'room': this.data.room
      })
    }

    // Launch fillers
    let options = {}
    if (this.room.getRoomSetting('PURE_CARRY_FILLERS')) {
      options['carry_only'] = true
      options['energy'] = 1600
    }
    this.launchCreepProcess('fillers', 'filler', this.data.room, 2, options)

    // Launch mining
    if (this.room.energyCapacityAvailable >= 800) {
      this.launchChildProcess('mining', 'city_mine', {
        'room': this.data.room
      })
    }

    // Launch mineral extraction
    if (this.room.isEconomyCapable('EXTRACT_MINERALS') && this.room.getRoomSetting('EXTRACT_MINERALS')) {
      // Note that once the program starts it won't stop until the minerals are mined out regardless of economic
      // conditions.
      this.launchChildProcess('extraction', 'city_extract', {
        'room': this.data.room
      })
    }

    // Launch upgraders
    if (this.room.isEconomyCapable('UPGRADE_CONTROLLERS')) {
      let upgraderQuantity = this.room.getRoomSetting('UPGRADERS_QUANTITY')
      if (this.room.isEconomyCapable('EXTRA_UPGRADERS')) {
        upgraderQuantity += 2
      }
      if (this.room.controller.level >= 8) {
        upgraderQuantity = 1
      }
      this.launchCreepProcess('upgraders', 'upgrader', this.data.room, upgraderQuantity, {
        'priority': 5
      })
    }
    if (this.room.controller.isTimingOut()) {
      this.launchCreepProcess('eupgrader', 'upgrader', this.data.room, 1, {
        priority: 1,
        energy: 200
      })
    }

    // Launch scouts to map out neighboring rooms
    if (this.room.getRoomSetting('SCOUTS')) {
      this.launchCreepProcess('scouts', 'spook', this.data.room, 1, {
        'priority': 4
      })
    }
  }
}

module.exports = City
