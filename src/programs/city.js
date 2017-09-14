
class City extends kernel.process {
  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    this.launchChildProcess('spawns', 'spawns', {'room': this.data.room})
    this.launchChildProcess('defense', 'city_defense', {'room': this.data.room})

    // If the room isn't planned launch the room layout program
    if (!this.room.getLayout().isPlanned()) {
      this.launchChildProcess('layout', 'city_layout', {'room': this.data.room})
    }

    // Launch upgraders
    this.launchCreepProcess('upgraders', 'upgrader', this.data.room, 5)
  }
}

module.exports = City
