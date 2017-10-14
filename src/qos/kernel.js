'use strict'

const Scheduler = require('qos_scheduler')
const Performance = require('qos_performance')
const Process = require('qos_process')

const BUCKET_FLOOR = 2000
const BUCKET_CEILING = 9500
const CPU_BUFFER = 130
const CPU_MINIMUM = 0.50
const CPU_ADJUST = 0.05

class QosKernel {
  constructor () {
    global.kernel = this

    if (!Memory.qos) {
      Memory.qos = {}
    }
    this.simulation = !!Game.rooms['sim']
    this.scheduler = new Scheduler()
    this.performance = new Performance()
    this.process = Process
  }

  start () {
    // Announce new uploads
    Logger.log(`Initializing Kernel for tick ${Game.time}`, LOG_INFO, 'kernel')
    if (!Memory.qos.script_version || Memory.qos.script_version !== SCRIPT_VERSION) {
      Logger.log(`New script upload detected: ${SCRIPT_VERSION}`, LOG_WARN)
      Memory.qos.script_version = SCRIPT_VERSION
      Memory.qos.script_upload = Game.time
    }

    sos.lib.segments.moveToGlobalCache()
    sos.lib.stormtracker.track()

    if (Game.time % 7 === 0) {
      this.cleanMemory()
    }

    this.scheduler.shift()

    if (this.scheduler.getProcessCount() <= 0) {
      this.scheduler.launchProcess('player')
    }
  }

  cleanMemory () {
    let i
    for (i in Memory.creeps) { // jshint ignore:line
      if (!Game.creeps[i]) {
        delete Memory.creeps[i]
      }
    }

    sos.lib.cache.clean()
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

        Logger.log(`Running ${processName} (pid ${runningProcess.pid})`, LOG_INFO, 'kernel')
        const startCpu = Game.cpu.getUsed()
        runningProcess.run()
        let performanceName = runningProcess.name
        const performanceDescriptor = runningProcess.getPerformanceDescriptor()
        if (performanceDescriptor) {
          performanceName += ' ' + performanceDescriptor
        }
        this.performance.addProgramStats(performanceName, Game.cpu.getUsed() - startCpu)
      } catch (err) {
        Logger.log('program error occurred', LOG_ERROR)
        Logger.log(`process ${runningProcess.pid}: ${runningProcess.name}`, LOG_ERROR)
        if (!!err && !!err.stack) {
          Logger.log(err.stack, LOG_ERROR)
        } else {
          Logger.log(err.toString(), LOG_ERROR)
        }
        // (!!err && !!err.stack) ? Logger.log(err.stack, LOG_ERROR) : Logger.log(err.toString(), LOG_ERROR)
      }
      Logger.defaultLogGroup = 'default'
    }
  }

  shouldContinue () {
    return !!this.simulation || Game.cpu.getUsed() < this.getCpuLimit()
  }

  getCpuLimit () {
    if (Game.cpu.bucket > BUCKET_CEILING) {
      return Game.cpu.tickLimit - CPU_BUFFER
    }

    if (Game.cpu.bucket < BUCKET_FLOOR) {
      return Game.cpu.limit * CPU_MINIMUM
    }

    if (!this._cpuLimit) {
      const bucketRange = BUCKET_CEILING - BUCKET_FLOOR
      const adjustedPercentage = (Game.cpu.bucket - (10000 - bucketRange)) / bucketRange
      const cpuPercentage = CPU_MINIMUM + ((1 - CPU_MINIMUM) * adjustedPercentage)
      this._cpuLimit = (Game.cpu.limit * (1 - CPU_ADJUST)) * cpuPercentage
    }

    return this._cpuLimit
  }

  shutdown () {
    sos.lib.vram.saveDirty()
    sos.lib.segments.process()

    const processCount = this.scheduler.getProcessCount()
    const completedCount = this.scheduler.memory.processes.completed.length

    Logger.log(`Processes Run: ${completedCount}/${processCount}`, LOG_INFO, 'kernel')
    Logger.log(`Tick Limit: ${Game.cpu.tickLimit}`, LOG_INFO, 'kernel')
    Logger.log(`Kernel Limit: ${this.getCpuLimit()}`, LOG_INFO, 'kernel')
    Logger.log(`CPU Used: ${Game.cpu.getUsed()}`, LOG_INFO, 'kernel')
    Logger.log(`Bucket: ${Game.cpu.bucket}`, LOG_INFO, 'kernel')

    if (Game.time % 50 === 0) {
      this.performance.reportHtml()
    }
    if (Game.time % 3000 === 0) {
      this.performance.clear()
    }
  }
}

module.exports = QosKernel
