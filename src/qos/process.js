'use strict';

class Process {
  constructor(pid, name, data, parent) {
    this.pid = pid;
    this.name = name;
    this.data = data;
    this.parent = parent;
  }

  clean() {
    if (this.data.children) {
      let label;
      for (label in this.data.children) { // jshint ignore:line
        if (!kernel.scheduler.isPidActive(this.data.children[label])) {
          delete this.data.children[label];
        }
      }
    }

    if (this.data.processes) {
      let label;
      for (label in this.data.processes) { // jshint ignore:line
        if (!kernel.scheduler.isPidActive(this.data.processes[label])) {
          delete this.data.processes[label];
        }
      }
    }
  }

  getDescriptor() {
    return false;
  }

  launchChildProcess(label, name, data = {}) {
    if (!this.data.children) {
      this.data.children = {};
    }
    if (this.data.children[label]) {
      return true;
    }
    this.data.children[label] = kernel.scheduler.launchProcess(name, data, this.pid);
    return this.data.children[label];
  }

  launchProcess(label, name, data = {}) {
    if (!this.data.processes) {
      this.data.processes = {};
    }

    if (this.data.processes[label]) {
      return true;
    }
    this.data.processes[label] = kernel.scheduler.launchProcess(name, data);
    return this.data.processes[label];
  }

  launchCreepProcess(label, role, roomname, quantity = 1, options = {}) {
    const room = Game.rooms[roomname];
    if (!room) {
      return false;
    }
    if (!this.data.children) {
      this.data.children = {};
    }
    let x, specificLabel, creepName;
    for (x = 0; x < quantity; x++) {
      specificLabel = label + x;
      if (this.data.children[specificLabel]) {
        continue;
      }
      creepName = room.queueCreep(role, options);
      this.launchChildProcess(specificLabel, 'creep', {
        'creep': creepName,
      });
    }
  }

  period(interval, label = 'default') {
    if (!this.data.period) {
      this.data.period = {};
    }

    const lastRun = this.data.period[label] || 0;
    if (lastRun < Game.time - interval) {
      this.data.period[label] = Game.time;
      return true;
    }

    return false;
  }

  suicide() {
    return kernel.scheduler.kill(this.pid);
  }

  run() {
    this.clean();
    this.main();
  }
}

module.exports = Process;
