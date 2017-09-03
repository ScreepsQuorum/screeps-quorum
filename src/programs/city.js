
class City extends kernel.process {
  main () {
    if(!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.launchChildProcess('spawns', 'spawns', {'room': this.data.room})

    // Launch upgraders
    this.launchCreepProcess('upgraders', 'upgrader', this.data.room, 5)
  }
}

module.exports = City
