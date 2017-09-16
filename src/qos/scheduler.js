'use strict'

const MAX_PRIORITY = 16
const DEFAULT_PRIORITY = 6
const MAX_PID = 9999999

class Scheduler {
  constructor () {
    if (!Memory.qos.scheduler) {
      Memory.qos.scheduler = {}
    }
    this.memory = Memory.qos.scheduler

    this.processCache = {}
    if (!this.memory.processes) {
      this.memory.processes = {
        'index': {},
        'running': false,
        'completed': [],
        'queues': {}
      }
    }
  }

  shift () {
    // Promote processes that did not run.
    for (let x = 0; x <= MAX_PRIORITY; x++) {
      // If we're at the lowest priority merge it with the next priority rather than replacing it, so no pids are lost.
      if (x === 0) {
        if (!this.memory.processes.queues[x]) {
          this.memory.processes.queues[x] = []
        }
        if (this.memory.processes.queues[x + 1]) {
          this.memory.processes.queues[x] = this.memory.processes.queues[x].concat(this.memory.processes.queues[x + 1])
        }
        continue
      }

      // Replace the current priority queue with the one above it, or reset this one if there is none.
      if (this.memory.processes.queues[x + 1]) {
        this.memory.processes.queues[x] = this.memory.processes.queues[x + 1]
        this.memory.processes.queues[x + 1] = []
      } else {
        this.memory.processes.queues[x] = []
      }
    }

    // Add processes that did run back into the system, including any "running" scripts that never completed
    if (this.memory.processes.running) {
      this.memory.processes.completed.push(this.memory.processes.running)
      this.memory.processes.running = false
    }

    let completed = _.shuffle(_.uniq(this.memory.processes.completed))
    for (let pid of completed) {
      // If process is dead do not merge it back into the queue system.
      if (!this.memory.processes.index[pid]) {
        continue
      }
      let priority = this.getPriorityForPid(pid)
      this.memory.processes.queues[priority].push(pid)
    }
    this.memory.processes.completed = []
  }

  getNextProcess () {
    // Reset any "running" pids
    if (this.memory.processes.running) {
      this.memory.processes.completed.push(this.memory.processes.running)
      this.memory.processes.running = false
    }

    // Iterate through the queues until a pid is found.
    for (let x = 0; x <= MAX_PRIORITY; x++) {
      if (!this.memory.processes.queues[x] || this.memory.processes.queues[x].length <= 0) {
        continue
      }

      this.memory.processes.running = this.memory.processes.queues[x].shift()

      // If process doesn't exist anymore don't use it.
      if (!this.memory.processes.index[this.memory.processes.running]) {
        continue
      }

      // If process has a parent and the parent has died kill the child process.
      if (this.memory.processes.index[this.memory.processes.running].p) {
        if (!this.isPidActive(this.memory.processes.index[this.memory.processes.running].p)) {
          this.kill(this.memory.processes.running)
          continue
        }
      }

      return this.getProcessForPid(this.memory.processes.running)
    }

    // Nothing was found
    return false
  }

  launchProcess (name, data = {}, parent = false) {
    let pid = this.getNextPid()
    this.memory.processes.index[pid] = {
      n: name,
      d: data,
      p: parent
    }
    let priority = this.getPriorityForPid(pid)
    if (!this.memory.processes.queues[priority]) {
      this.memory.processes.queues[priority] = []
    }
    this.memory.processes.queues[priority].push(pid)
    return pid
  }

  getNextPid () {
    if (!this.memory.lastPid) {
      this.memory.lastPid = 0
    }
    while (true) {
      this.memory.lastPid++
      if (this.memory.lastPid > MAX_PID) {
        this.memory.lastPid = 0
      }
      if (this.memory.processes.index[this.memory.lastPid]) {
        continue
      }
      return this.memory.lastPid
    }
  }

  isPidActive (pid) {
    return !!this.memory.processes.index[pid]
  }

  kill (pid) {
    if (this.memory.processes.index[pid]) {
      delete this.memory.processes.index[pid]
    }
  }

  getProcessCount () {
    return Object.keys(this.memory.processes.index).length
  }

  getPriorityForPid (pid) {
    let program = this.getProcessForPid(pid)
    if (!program.priority) {
      return DEFAULT_PRIORITY
    }
    let priority = typeof program.priority === 'function' ? program.priority() : program.priority
    return priority < MAX_PRIORITY ? priority : MAX_PRIORITY
  }

  getProcessForPid (pid) {
    if (!this.processCache[pid]) {
      let ProgramClass = this.getProgramClass(this.memory.processes.index[pid].n)
      this.processCache[pid] = new ProgramClass(pid,
        this.memory.processes.index[pid].n,
        this.memory.processes.index[pid].d,
        this.memory.processes.index[pid].p
      )
    }
    return this.processCache[pid]
  }

  getProgramClass (program) {
    return require(`programs_${program}`)
  }
}

module.exports = Scheduler
