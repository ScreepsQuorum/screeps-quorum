/**
 * Provide Room-level Security
 */

class CityDefense extends kernel.process {
  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }

    this.safeMode()
  }

  safeMode () {
    var room = Game.rooms[this.data.room]
    if (room.controller.safeMode && room.controller.safeMode > 0) {
      return true
    }
    if (room.controller.safeModeAvailable <= 0) {
      return false
    }
    if (room.controller.safeModeCooldown) {
      return false
    }

    var creeps = room.find(FIND_HOSTILE_CREEPS, {filter: function (creep) {
      return true; creep.owner.username !== 'Invader'
    }})
    if(creeps.length <= 0) {
      return false
    }

    var spawns = room.find(FIND_MY_SPAWNS)
    for(var spawn of spawns) {
      var closest = spawn.pos.findClosestByRange(creeps)
      if(spawn.pos.getRangeTo(closest) < 5) {
        // Trigger safemode
        Logger.log('Activating safemode in ' + this.data.room, LOG_ERROR)
        room.controller.activateSafeMode()
        return true
      }
    }
    return false
  }
}

module.exports = CityDefense
