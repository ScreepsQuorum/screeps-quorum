'use strict'

const Scheduler = require('qos_scheduler')
const Performance = require('qos_performance')
const Process = require('qos_process')

global.BUCKET_EMERGENCY = 1000
global.BUCKET_FLOOR = 2000
global.BUCKET_CEILING = 9500
const BUCKET_BUILD_LIMIT = 15000
const CPU_BUFFER = 130
const CPU_MINIMUM = 0.30
const CPU_ADJUST = 0.05
const CPU_GLOBAL_BOOST = 60
const MINIMUM_PROGRAMS = 0.3
const PROGRAM_NORMALIZING_BURST = 2
const RECURRING_BURST = 1.75
const RECURRING_BURST_FREQUENCY = 25
const MIN_TICKS_BETWEEN_GC = 20
const GC_HEAP_TRIGGER = 0.85
const GLOBAL_LAST_RESET = Game.time
const IVM = typeof Game.cpu.getHeapStatistics === 'function' && Game.cpu.getHeapStatistics()

class QosKernel {
  constructor () {
    global.kernel = this

    if (!Memory.qos) {
      Memory.qos = {}
    }
    this.newglobal = GLOBAL_LAST_RESET === Game.time
    this.simulation = !!Game.rooms.sim
    this.scheduler = new Scheduler()
    this.performance = new Performance()
    this.process = Process
  }

  start () {
    if (IVM) {
      Logger.log(`Initializing Kernel for tick ${Game.time} with IVM support`, LOG_TRACE, 'kernel')
    } else {
      Logger.log(`Initializing Kernel for tick ${Game.time}`, LOG_TRACE, 'kernel')
    }

    // Announce new uploads
    if (!Memory.qos.script_version || Memory.qos.script_version !== SCRIPT_VERSION) {
      Logger.log(`New script upload detected: ${SCRIPT_VERSION}`, LOG_WARN)
      Memory.qos.script_version = SCRIPT_VERSION
      Memory.qos.script_upload = Game.time
      this.performance.clear()
    }

    if (this.newglobal) {
      Logger.log('New Global Detected', LOG_INFO)
    }

    if (IVM && global.gc && (!Memory.qos.gc || Game.time - Memory.qos.gc >= MIN_TICKS_BETWEEN_GC)) {
      const heap = Game.cpu.getHeapStatistics()
      const heapPercent = heap.total_heap_size / heap.heap_size_limit
      if (heapPercent > GC_HEAP_TRIGGER) {
        Logger.log('Garbage Collection Initiated', LOG_INFO, 'kernel')
        Memory.qos.gc = Game.time
        global.gc()
      }
    }

    sos.lib.segments.moveToGlobalCache()
    sos.lib.stormtracker.track()

    if (sos.lib.stormtracker.isStorming()) {
      Logger.log('Reset Storm Detected', LOG_INFO)
    }

    if (Game.time % 7 === 0) {
      this.cleanMemory()
    }

    this.scheduler.wakeSleepingProcesses()
    this.scheduler.shift()

    if (this.scheduler.getProcessCount() <= 0) {
      this.scheduler.launchProcess('player')
    }
  }

  cleanMemory () {
    Logger.log('Cleaning memory', LOG_TRACE, 'kernel')
    let i
    for (i in Memory.creeps) { // jshint ignore:line
      if (!Game.creeps[i]) {
        delete Memory.creeps[i]
      }
    }

    sos.lib.cache.clean()
    qlib.notify.clean()
  }

  run () {
    while (this.shouldContinue()) {
      const runningProcess = this.scheduler.getNextProcess()
      if (!runningProcess) {
        return
      }
      Logger.defaultLogGroup = runningProcess.name
      try {
        let processName = runningProcess.name
        const descriptor = runningProcess.getDescriptor()
        if (descriptor) {
          processName += ' ' + descriptor
        }

        Logger.log(`Running ${processName} (pid ${runningProcess.pid})`, LOG_TRACE, 'kernel')
        const startCpu = Game.cpu.getUsed()
        runningProcess.run()
        let performanceName = runningProcess.name
        const performanceDescriptor = runningProcess.getPerformanceDescriptor()
        if (performanceDescriptor) {
          performanceName += ' ' + performanceDescriptor
        }
        this.performance.addProgramStats(performanceName, Game.cpu.getUsed() - startCpu)
      } catch (err) {
        const errorText = !!err && !!err.stack ? err.stack : err.toString()
        if (errorText.includes('RangeError: Array buffer allocation failed')) {
          const message = 'RangeError: Array buffer allocation failed'
          Logger.log(message, LOG_ERROR, 'ivm')
        } else {
          let message = 'program error occurred\n'
          message += `process ${runningProcess.pid}: ${runningProcess.name}\n`
          message += errorText
          Logger.log(message, LOG_ERROR)
        }
      }
      Logger.defaultLogGroup = 'default'
    }
  }

  sigmoid (x) {
    return 1.0 / (1.0 + Math.exp(-x))
  }

  sigmoidSkewed (x) {
    return this.sigmoid((x * 12.0) - 6.0)
  }

  shouldContinue () {
    if (this.simulation) {
      return true
    }

    // If the bucket has dropped below the emergency level enable the bucket rebuild functionality.
    if (Game.cpu.bucket <= BUCKET_EMERGENCY) {
      if (!Memory.qos.last_build_bucket || (Game.time - Memory.qos.last_build_bucket) > BUCKET_BUILD_LIMIT) {
        Memory.qos.build_bucket = true
        Memory.qos.last_build_bucket = Game.time
        return false
      }
    }

    // If the bucket rebuild flag is set don't run anything until the bucket has been reset.
    if (Memory.qos.build_bucket) {
      if (Game.cpu.bucket >= BUCKET_CEILING) {
        delete Memory.qos.build_bucket
      } else {
        return false
      }
    }

    // Make sure to stop if cpuUsed has hit the maximum allowed cpu.
    const cpuUsed = Game.cpu.getUsed()
    if (cpuUsed >= Game.cpu.tickLimit - CPU_BUFFER) {
      return false
    }

    // Allow if the cpu used is less than this tick's limit.
    const cpuLimit = this.getCpuLimit()
    if (cpuUsed < cpuLimit) {
      return true
    }

    // Ensure that a minumum number of processes runs each tick.
    // This is primarily useful for garbage collection cycles.
    if (Game.cpu.bucket > BUCKET_FLOOR) {
      const total = this.scheduler.getProcessCount()
      const completed = this.scheduler.getCompletedProcessCount()
      if (completed / total < MINIMUM_PROGRAMS) {
        if (cpuUsed < cpuLimit * PROGRAM_NORMALIZING_BURST) {
          return true
        }
      }
    }

    return false
  }

  getCpuLimit () {
    if (Game.cpu.bucket > BUCKET_CEILING) {
      return Math.min(Game.cpu.tickLimit - CPU_BUFFER, Game.cpu.bucket * 0.05)
    }

    if (Game.cpu.bucket < BUCKET_EMERGENCY) {
      return 0
    }

    if (Game.cpu.bucket < BUCKET_FLOOR) {
      return Game.cpu.limit * CPU_MINIMUM
    }

    if (!this._cpuLimit) {
      const bucketRange = BUCKET_CEILING - BUCKET_FLOOR
      const depthInRange = (Game.cpu.bucket - BUCKET_FLOOR) / bucketRange
      const minToAllocate = Game.cpu.limit * CPU_MINIMUM
      const maxToAllocate = Game.cpu.limit
      this._cpuLimit = (minToAllocate + this.sigmoidSkewed(depthInRange) * (maxToAllocate - minToAllocate)) * (1 - CPU_ADJUST)
      if (this.newglobal) {
        this._cpuLimit += CPU_GLOBAL_BOOST
      } else if (RECURRING_BURST_FREQUENCY && Game.time % RECURRING_BURST_FREQUENCY === 0) {
        this._cpuLimit *= RECURRING_BURST
      }
    }

    return this._cpuLimit
  }

  shutdown () {
    sos.lib.vram.saveDirty()
    sos.lib.segments.process()

    const processCount = this.scheduler.getProcessCount()
    const completedCount = this.scheduler.memory.processes.completed.length

    if (Memory.userConfig && Memory.userConfig.terseConsole) {
      let message = ''
      message += `PS: ${_.padLeft(`${completedCount}/${processCount}`, 7)}`
      message += `, TL: ${_.padLeft(Game.cpu.tickLimit, 3)}`
      message += `, KL: ${_.padLeft(this.getCpuLimit(), 3)}`
      message += `, CPU: ${_.padLeft(Game.cpu.getUsed().toFixed(5), 8)}`
      message += `, B: ${_.padLeft(Game.cpu.bucket, 5)}`

      if (IVM) {
        const heap = Game.cpu.getHeapStatistics()
        const heapPercent = Math.round((heap.total_heap_size / heap.heap_size_limit) * 100)
        const sizeMB = heap.total_heap_size >> 20
        const limitMB = heap.heap_size_limit >> 20
        message += `, H: ${_.padLeft(heapPercent, 2)}% ${_.padLeft(`(${sizeMB}/${limitMB}MB)`, 11)}`
      }
      Logger.log(message, LOG_INFO, 'kernel')
    } else {
      Logger.log(`Processes Run: ${completedCount}/${processCount}`, LOG_INFO, 'kernel')
      Logger.log(`Tick Limit: ${Game.cpu.tickLimit}`, LOG_INFO, 'kernel')
      Logger.log(`Kernel Limit: ${this.getCpuLimit()}`, LOG_INFO, 'kernel')
      Logger.log(`CPU Used: ${Game.cpu.getUsed()}`, LOG_INFO, 'kernel')
      Logger.log(`Bucket: ${Game.cpu.bucket}`, LOG_INFO, 'kernel')

      if (IVM) {
        const heap = Game.cpu.getHeapStatistics()
        const heapPercent = Math.round((heap.total_heap_size / heap.heap_size_limit) * 100)
        Logger.log(`Heap Used: ${heapPercent}% (${heap.total_heap_size} / ${heap.heap_size_limit})`, LOG_INFO, 'kernel')
      }
    }

    if (Game.time % 50 === 0) {
      this.performance.reportHtml()
    }
    if (Game.time % 3000 === 0) {
      this.performance.clear()
    }
  }
}

module.exports = QosKernel
