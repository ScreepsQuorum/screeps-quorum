
class Spawns extends kernel.process {
  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]
    var spawns = this.room.find(FIND_MY_SPAWNS)

    for (var spawn of spawns) {
      if (spawn.spawning) {
        continue
      }
      var creep = this.room.getQueuedCreep()
      if (!creep) {
        break
      }
      var ret = spawn.createCreep(creep.build, creep.name, creep.memory)
      if (Number.isInteger(ret)) {
        Logger.log('Error ' + ret + ' while spawning creep ' + creep.name + ' in room ' + this.data.room, LOG_ERROR)
      } else {
        Logger.log('Spawning creep ' + creep.name + ' from ' + this.data.room)
      }
    }
  }
}

module.exports = Spawns
