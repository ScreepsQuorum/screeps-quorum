'use strict'

/**
 * This program handles spawning of creeps.
 */
class Spawns extends kernel.process {
  getDescriptor() {
    return this.data.room
  }

  main() {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]
    let spawns = this.room.find(FIND_MY_SPAWNS)

    for (let spawn of spawns) {
      if (spawn.spawning) {
        continue
      }
      let creep = this.room.getQueuedCreep()
      if (!creep) {
        break
      }
      let ret = spawn.createCreep(creep.build, creep.name, creep.memory)
      if (Number.isInteger(ret)) {
        Logger.log(`Error ${ret} while spawning creep ${creep.name} in room ${this.data.room}`, LOG_ERROR)
      } else {
        Logger.log(`Spawning creep ${creep.name} from ${this.data.room}`)
      }
    }
  }
}

module.exports = Spawns
