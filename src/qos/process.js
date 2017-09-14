
class Process {
  constructor (pid, name, data, parent) {
    this.pid = pid
    this.name = name
    this.data = data
    this.parent = parent
  }

  clean () {
    if (this.data.children) {
      for (let label in this.data.children) {
        if (!kernel.scheduler.isPidActive(this.data.children[label])) {
          delete this.data.children[label]
        }
      }
    }

    if (this.data.processes) {
      for (let label in this.data.processes) {
        if (!kernel.scheduler.isPidActive(this.data.processes[label])) {
          delete this.data.processes[label]
        }
      }
    }
  }

  getDescriptor () {
    return false
  }

  launchChildProcess (label, name, data = {}) {
    if (!this.data.children) {
      this.data.children = {}
    }
    if (this.data.children[label]) {
      return true
    }
    this.data.children[label] = kernel.scheduler.launchProcess(name, data, this.pid)
    return this.data.children[label]
  }

  launchProcess (label, name, data = {}) {
    if (!this.data.processes) {
      this.data.processes = {}
    }

    if (this.data.processes[label]) {
      return true
    }
    this.data.processes[label] = kernel.scheduler.launchProcess(name, data)
    return this.data.processes[label]
  }

  launchCreepProcess (label, role, roomname, quantity = 1, options = {}) {
    var room = Game.rooms[roomname]
    if (!room) {
      return false
    }
    if (!this.data.children) {
      this.data.children = {}
    }
    for (var x = 0; x < quantity; x++) {
      var specificLabel = label + x
      if (this.data.children[specificLabel]) {
        continue
      }
      var creepName = room.queueCreep(role, options)
      this.launchChildProcess(specificLabel, 'creep', {'creep': creepName})
    }
  }

  suicide () {
    return kernel.scheduler.kill(this.pid)
  }

  run () {
    this.clean()
    this.main()
  }
}

module.exports = Process
