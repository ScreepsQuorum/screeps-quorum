'use strict'

var Monitor = function () {
  if(!Memory.sos) {
    return
  }

  if(!Memory.sos.monitor) {
    Memory.sos.monitor = {}
  }

  if(!Memory.sos.monitor.priority_tbr) {
    Memory.sos.monitor.priority_tbr = {}
  }

  if(!Memory.sos.monitor.priority_ft) {
    Memory.sos.monitor.priority_ft = {}
  }


  //this.currbucket = this.resolution * Math.floor(Game.time / this.resolution)
  this.maxbuckets = Math.ceil(this.maxage / this.resolution) + 1
}


Monitor.prototype.resolution = 100
Monitor.prototype.maxage = 3000
Monitor.prototype.short = 200
Monitor.prototype.medium = 1000
Monitor.prototype.long = 3000

Monitor.prototype.markRun = function (priority) {
  var currbucket = this.resolution * Math.floor(Game.time / this.resolution)

  if(!Memory.sos.monitor.priority_ft[priority]) {
    Memory.sos.monitor.priority_ft[priority] = Game.time
  }

  if(!Memory.sos.monitor.priority_tbr[priority]) {
    Memory.sos.monitor.priority_tbr[priority] = {}
  }

  if(!Memory.sos.monitor.priority_tbr[priority][currbucket]) {
    Memory.sos.monitor.priority_tbr[priority][currbucket] = 0
  }
  Memory.sos.monitor.priority_tbr[priority][currbucket]++

  var buckets = Object.keys(Memory.sos.monitor.priority_tbr[priority])
  if(buckets.length > this.maxbuckets) {
    buckets.sort((a,b) => parseInt(a) - parseInt(b))
    delete Memory.sos.monitor.priority_tbr[priority][buckets[0]]
  }
}


Monitor.prototype.getPriorityRunStats = function (priority) {
  var currbucket = this.resolution * Math.floor(Game.time / this.resolution)
  var currticks = Game.time - currbucket
  var numticks = this.resolution * Math.ceil(numticks / this.resolution)
  var numbuckets = this.long / this.resolution

  if(!Memory.sos.monitor.priority_tbr[priority]) {
    return false
  }

  if(!Memory.sos.monitor.priority_ft[priority]) {
    return false
  }

  if(Game.time - Memory.sos.monitor.priority_ft[priority] < (+numticks + +this.resolution)) {
    return false
  }

  var data = Memory.sos.monitor.priority_tbr[priority]
  var buckets = Object.keys(data)
  buckets.sort((a,b) => parseInt(b) - parseInt(a))

  if (!data[currbucket]) {
    data[currbucket] = 0
  }

  var shortticks = data[currbucket]
  var mediumticks = data[currbucket]
  var longticks = data[currbucket]
  for(var i = 1; i <= numbuckets; i++) {
    var count = i * this.resolution
    var thisbucket = currbucket - count
    if(!!data[thisbucket]) {
      if(count <= this.short) {
        shortticks += data[thisbucket]
      }
      if(count <= this.medium) {
        mediumticks += data[thisbucket]
      }
      if(count <= this.long) {
        longticks += data[thisbucket]
      }
    }
  }

  return {
    short: Math.max((this.short + currticks) / shortticks, 1),
    medium: Math.max((this.medium + currticks) / mediumticks, 1),
    long: Math.max((this.long + currticks) / longticks, 1),
  }
}


module.exports = new Monitor()
