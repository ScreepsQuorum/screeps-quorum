'use strict'

global.DEFAULT_PRIORITY = global.PRIORITIES_DEFAULT || 6
const MAX_PRIORITY = 16
const MAX_PID = 9999999
const WALL = 9

class Scheduler {
  constructor () {
    if (!Memory.qos.scheduler) {
      Memory.qos.scheduler = {}
    }
    this.memory = Memory.qos.scheduler

    this.processCache = {}
    if (!this.memory.processes) {
      this.memory.processes = {
        index: {},
        running: false,
        completed: [],
        queues: {},
        sleep: {}
      }
    } else {
      // For upgrading
      if (!this.memory.processes.sleep) {
        this.memory.processes.sleep = {}
      }
    }
  }

  wakeSleepingProcesses () {
    if (this.memory.processes.sleep.newProcesses) {
      // We remove processes from the completed list now because else the kernel wouldn't know that they were run
      this.memory.processes.sleep.newProcesses.forEach(function (pid) {
        const i = kernel.scheduler.memory.processes.completed.indexOf(pid)
        if (i > -1) {
          kernel.scheduler.memory.processes.completed.splice(i, 1)
        }
      })
      delete this.memory.processes.sleep.newProcesses
    }

    if (this.memory.processes.sleep.nextCheck && this.memory.processes.sleep.nextCheck <= Game.time) {
      let sleepCount = 0
      // Resume the right processes
      for (let pid in this.memory.processes.sleep.list) {
        pid = Number(pid)
        const tick = this.memory.processes.sleep.list[pid]
        if (tick <= Game.time) {
          this.wake(pid)
        } else {
          if (this.memory.processes.sleep.nextCheck <= Game.time || this.memory.processes.sleep.nextCheck > tick) {
            this.memory.processes.sleep.nextCheck = tick
          }
          sleepCount++
        }
      }

      // If there are no sleeping processes we don't need to check for them the next time
      if (sleepCount === 0) {
        this.memory.processes.sleep.nextCheck = -1
      }
    }
  }

  shift () {
    // Promote processes that did not run.
    for (let x = 0; x <= MAX_PRIORITY; x++) {
      // If we're at the lowest priority merge it with the next priority rather than replacing it, so no pids are lost.
      if (x === 0 || x === WALL) {
        if (!this.memory.processes.queues[x]) {
          this.memory.processes.queues[x] = []
        }
        if (this.memory.processes.queues[x + 1]) {
          this.memory.processes.queues[x] = this.memory.processes.queues[x].concat(this.memory.processes.queues[x + 1])
        }
        continue
      }

      // Don't merge priorities from above the wall to below it.
      if ((x + 1) === WALL) {
        continue
      }

      // If the last tick did not hit the wall then do not promote "above the wall" processes.
      if (x >= WALL && this.memory.processes.hitwall) {
        break
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

    // Randomize order of completed processes before reinserting them to
    // * prevent error prone combinations (such as two really high processes running back to back) from recurring,
    // * keep specific processes from being favored by the scheduler.
    const completed = _.shuffle(_.uniq(this.memory.processes.completed))
    let pid
    for (pid of completed) {
      // If process is dead do not merge it back into the queue system.
      if (!this.memory.processes.index[pid]) {
        continue
      }
      try {
        const priority = this.getPriorityForPid(pid)
        this.memory.processes.queues[priority].push(pid)
      } catch (err) {
        delete this.memory.processes.index[pid]
        Logger.log(err, LOG_ERROR)
      }
    }
    this.memory.processes.hitwall = false
    this.memory.processes.completed = []
  }

  getNextProcess () {
    // Reset any "running" pids
    if (this.memory.processes.running) {
      this.memory.processes.completed.push(this.memory.processes.running)
      this.memory.processes.running = false
    }

    // Iterate through the queues until a pid is found.
    let x
    for (x = 0; x <= MAX_PRIORITY; x++) {
      if (x >= WALL) {
        this.memory.processes.hitwall = true
      }
      if (!this.memory.processes.queues[x] || this.memory.processes.queues[x].length <= 0) {
        continue
      }

      this.memory.processes.running = this.memory.processes.queues[x].shift()

      // Don't run this pid twice in a single tick.
      if (this.memory.processes.completed.includes(this.memory.processes.running)) {
        continue
      }

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
    const pid = this.getNextPid()
    this.memory.processes.index[pid] = {
      n: name,
      d: data,
      p: parent
    }
    const priority = this.getPriorityForPid(pid)
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
      // Process needs to be woken up first
      this.wake(pid)
      delete this.memory.processes.index[pid]
    }
  }

  sleep (pid, ticks, self = false) {
    if ((typeof ticks) === 'number' && this.memory.processes.index[pid]) {
      // Remove process from execution queue, but not if the process has called sleeping itself
      if (!self) {
        for (let i in this.memory.processes.queues) {
          i = Number(i)
          const queue = this.memory.processes.queues[i]
          const index = queue.indexOf(pid)
          if (index > -1) {
            queue.splice(index, 1)
          }
        }
      }
      // Add process to list of new sleeping processes
      if (!this.memory.processes.sleep.newProcesses) {
        this.memory.processes.sleep.newProcesses = []
      }
      this.memory.processes.sleep.newProcesses.push(pid)

      // Create new sleep list if necessary
      if (!this.memory.processes.sleep.list) {
        this.memory.processes.sleep.list = []
      }
      const sleepUntil = Game.time + 1 + ticks
      // Add process to sleep list or update the tick it should sleep until
      this.memory.processes.sleep.list[pid] = sleepUntil
      // Tell the scheduler when next to check for processes needing to be waked up
      if (!this.memory.processes.sleep.nextCheck || this.memory.processes.sleep.nextCheck < sleepUntil) {
        this.memory.processes.sleep.nextCheck = sleepUntil
      }
    }
  }

  wake (pid) {
    if (this.memory.processes.index[pid] && this.memory.processes.sleep.list && this.memory.processes.sleep.list[pid]) {
      const priority = this.getPriorityForPid(pid)
      // Push the process back to the execution queue
      this.memory.processes.queues[priority].push(pid)
      // and remove it from sleep list
      delete this.memory.processes.sleep.list[pid]
    }
  }

  getProcessCount () {
    return Object.keys(this.memory.processes.index).length
  }

  getCompletedProcessCount () {
    return this.memory.processes.completed.length
  }

  getPriorityForPid (pid) {
    const program = this.getProcessForPid(pid)
    if (!program.getPriority) {
      return DEFAULT_PRIORITY
    }
    const priority = program.getPriority()
    return priority < MAX_PRIORITY ? priority : MAX_PRIORITY
  }

  getProcessForPid (pid) {
    if (!this.processCache[pid]) {
      const ProgramClass = this.getProgramClass(this.memory.processes.index[pid].n)
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
