'use strict'

/**
 * Scans all currently visible rooms and records useful information about them.
 */

class EmpireIntel extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_EMPIRE_INTEL
  }

  main () {
    this.gatherIntel()
    this.flushIntel()
    if (!this.data.lastclean || Game.time - this.data.lastclean > 100) {
      this.cleanTargets()
      this.data.lastclean = Game.time
    }
  }

  gatherIntel () {
    const roomnames = Object.keys(Game.rooms)
    let roomname
    for (roomname of roomnames) {
      const room = Game.rooms[roomname]
      if (room.controller && room.controller.my) {
        continue
      }
      const roominfo = room.getIntel(roomname)
      if (Game.time - roominfo[INTEL_UPDATED] > 60) {
        room.saveIntel()
      }
    }
  }

  flushIntel () {
    if (!Memory.intel) {
      return
    }
    const buffersize = Object.keys(Memory.intel.buffer).length
    if (buffersize < 0) {
      return
    }
    if (!this.data.lastflush || Game.time - this.data.lastflush > 50 || buffersize > 80) {
      Room.flushIntelToSegment()
    }
  }

  cleanTargets () {
    const targets = Object.keys(Memory.intel.targets)
    for (let target of targets) {
      if (Game.time - Memory.intel.targets[target] > 5000) {
        delete Memory.intel.targets[target]
      }
    }
  }
}

module.exports = EmpireIntel
