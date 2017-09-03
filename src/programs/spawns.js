
class Spawns extends kernel.process {
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
      if (ret !== OK) {
        Logger.log('Error ' + ret + ' while spawning creep ' + creep.name, LOG_ERROR)
      }
    }
  }
}

module.exports = Spawns
