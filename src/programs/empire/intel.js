'use strict'

/**
 * Scans all currently visible rooms and records useful information about them.
 */

const EMERGENCY_TARGET_TRIGGER = MAX_INTEL_TARGETS * 2

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
    if (!Memory.intel) {
      return
    }

    // Bugfix for active systems and future unforeseen bugs - just erase giant target lists.
    if (Memory.intel.targets.length > EMERGENCY_TARGET_TRIGGER) {
      Memory.intel.targets = {}
      return
    }

    // Purge older requests until limit is reached.
    const targets = Object.keys(Memory.intel.targets)
    if (targets.length > MAX_INTEL_TARGETS) {
      targets.sort((a, b) => Memory.intel.targets[a] - Memory.intel.targets[b])
      for (let target of targets) {
        if (Object.keys(Memory.intel.targets).length <= MAX_INTEL_TARGETS) {
          break
        }
        delete Memory.intel.targets[target]
      }
    }
  }
}

module.exports = EmpireIntel
