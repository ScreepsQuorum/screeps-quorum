'use strict';

class City extends kernel.process {
  constructor(...args) {
    super(...args)
    this.priority = PRIORITIES_CITY
  }

  getDescriptor() {
    return this.data.room;
  }

  main() {
    if (!Game.rooms[this.data.room]) {
      return this.suicide();
    }
    this.room = Game.rooms[this.data.room];

    this.launchChildProcess('spawns', 'spawns', {
      'room': this.data.room,
    });
    this.launchChildProcess('defense', 'city_defense', {
      'room': this.data.room,
    });
    this.launchChildProcess('reboot', 'city_reboot', {
      'room': this.data.room,
    });

    // If the room isn't planned launch the room layout program, otherwise launch construction program
    if (!this.room.getLayout().isPlanned()) {
      this.launchChildProcess('layout', 'city_layout', {
        'room': this.data.room,
      });
    } else {
      this.launchChildProcess('construct', 'city_construct', {
        'room': this.data.room,
      });
    }

    // Launch fillers
    this.launchCreepProcess('fillers', 'filler', this.data.room, 2);

    // Launch upgraders
    this.launchCreepProcess('upgraders', 'upgrader', this.data.room, 5, {
      'priority': 5,
    });
  }
}

module.exports = City;
