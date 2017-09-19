'use strict';

var stats = {}

var defaultOpts = {
  'interval': 1,
  'maxrecord': 20,
  'drop': 0.2,
  'callback': false
}

stats.getRecord = function (key, opts={}) {
  opts = Object.assign({}, defaultOpts, opts);

  if(!Memory.sos) {
    return [opts.callback()]
  }

  if(!Memory.sos.stats) {
    Memory.sos.stats = {}
  }

  if(!!opts.value || !!opts.callback) {
    var lasttick = this.getRecordLastTick(key)
    if(!lasttick || Game.time - lasttick >= opts.interval) {
      if(opts.value) {
        var result = opts.value
      } else {
        var result = opts.callback()
      }

      if(!isNaN(parseFloat(result)) && isFinite(result)) {
        if(!Memory.sos.stats[key]) {
          Memory.sos.stats[key] = {
            r: [result],
            t: Game.time
          }
        } else {
          Memory.sos.stats[key].r.unshift(result)
          Memory.sos.stats[key].t = Game.time
        }
      }
    }

    if(this.getRecordCount(key) > opts.maxrecord) {
      Memory.sos.stats[key].r.pop()
    }
  } else {
    if(!Memory.sos.stats[key] || !Memory.sos.stats[key].r) {
      return [0]
    }
  }

  if(!Memory.sos.stats[key] || !Memory.sos.stats[key].r) {
    return [0]
  }

  if(opts.drop > 0) {
    var records = _.clone(Memory.sos.stats[key].r)
    var dropamount = Math.floor((records.length * opts.drop)/2)
    if(dropamount > 0) {
      records.sort((a,b) => a-b)
      for(var i = 0; i < dropamount; i++) {
        records.shift()
        records.pop()
      }
    }
  } else {
    var records = Memory.sos.stats[key].r
  }

  return records
}

stats.rollingAverage = function (key, opts={}) {
  var records = this.getRecord(key, opts)
  var record_sum = records.reduce((a, b) => a + b, 0)
  if(record_sum == 0) {
    return 0
  }
  return record_sum / records.length
}

stats.getHighest = function (key, opts={}) {
  var records = this.getRecord(key, opts)
  return _.max(records)
}

stats.getLowest = function (key, opts={}) {
  var records = this.getRecord(key, opts)
  return _.min(records.r)
}

stats.getAverage = function (key, opts={}) {
  var records = this.getRecord(key, opts)
  var sum = records.reduce((a, b) => a + b, 0)
  return sum / records.length
}

stats.getStdDev = function (key, opts={}) {
  var average = this.getAverage(key, opts)
  if(!average) {
    return average
  }
  var records = this.getRecord(key, opts)
  var squareDiffs = records.map(function(value){
    var diff = value - average;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var squareAvg = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
  return Math.sqrt(squareAvg);
}

stats.getRecordCount = function (key) {
  if(!Memory.sos || !Memory.sos.stats || !Memory.sos.stats[key]) {
    return false
  }

  return Memory.sos.stats[key].r.length
}

stats.getRecordLastTick = function (key) {
  if(!Memory.sos || !Memory.sos.stats || !Memory.sos.stats[key]) {
    return false
  }

  return Memory.sos.stats[key].t
}

module.exports = stats