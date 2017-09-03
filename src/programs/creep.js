/**
 * Creep Runner- it takes responsibility for a single creep
 */

class ProgramCreep extends kernel.process {
  main () {
    // See if creep is dead and if so close this process
    if (!Game.creeps[this.data.creep]) {
      if (!Room.isQueued(this.data.creep)) {
        this.suicide()
      }
      return
    }

    // Get creep
    var creep = Game.creeps[this.data.creep]
    if (creep.spawning) {
      return
    }

    // Load and run creep role
    var role = creep.getRole()
    role.manageCreep(creep)
  }
}

module.exports = ProgramCreep
