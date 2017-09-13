/**
 * Provide Room-level Security
 */

class CityReboot extends kernel.process {
  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]
    if(this.room.find(FIND_MY_CREEPS).length <= 0) {
      this.launchCreepProcess('rebooter', 'filler', this.data.room, 2, {priority: 1, energy: 300})
    }
  }
}

module.exports = CityReboot
