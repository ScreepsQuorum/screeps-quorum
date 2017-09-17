'use strict';

/**
 * Creep Runner- it takes responsibility for a single creep
 */

class ProgramCreep extends kernel.process {
  getDescriptor() {
    return this.data.creep;
  }

  main() {
    // See if creep is dead and if so close this process
    if (!Game.creeps[this.data.creep]) {
      if (!Room.isQueued(this.data.creep)) {
        this.suicide();
      }
      return;
    }

    // Get creep
    const creep = Game.creeps[this.data.creep];
    if (creep.spawning) {
      return;
    }

    // Load and run creep role
    const role = creep.getRole();
    role.manageCreep(creep);
  }
}

module.exports = ProgramCreep;
