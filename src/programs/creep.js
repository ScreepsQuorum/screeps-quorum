'use strict'
/**
 * Creep Runner- it takes responsibility for a single creep
 */

class ProgramCreep extends kernel.process {
  getPriority () {
    const role = Creep.getRoleFromName(this.data.creep)
    return role.getPriority()
  }

  getDescriptor () {
    return this.data.creep
  }

  getPerformanceDescriptor () {
    return this.data.creep.split('_', 1)[0]
  }

  main () {
    // See if creep is dead and if so close this process
    if (!Game.creeps[this.data.creep]) {
      if (!Room.isQueued(this.data.creep)) {
        this.suicide()
      }
      return
    }

    // Get creep
    const creep = Game.creeps[this.data.creep]
    if (creep.spawning) {
      return
    }

    // Load and run creep role
    const role = creep.getRole()
    role.manageCreep(creep)
  }
}

module.exports = ProgramCreep
