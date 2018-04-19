'use strict'

var sos_lib_profiler = {

  __running: {},

  __index: 0,

  start: function (name, category = 'adhoc', tags={}) {

    this.__index++
    var token = this.__index
    this.__running[token] = {
      name:name,
      tags:tags,
      category:category,
      start: Game.cpu.getUsed()
    }
    return token
  },

  end: function (token) {
    var finished = Game.cpu.getUsed()
    if(!this.__running[token]) {
      console.log('Profiler: no data found', LOG_ERROR)
      return false
    }

    var meta = this.__running[token]
    var cpu = finished - meta['start']

    if(!!Stats && !!Memory.sos.storeProfileStats) {
      var index = 'sosprofiler.p' + token
      var send = meta.tags
      send.block = meta.name
      send.category = meta.category
      send.cpu = cpu
      Stats.addStat(index, send, true)
    }

    console.log("Profiler\t" + meta.name + "\t" + cpu.toPrecision(4) + " cpu", LOG_INFO, false, {'profiler':true,block:meta.name})
    delete this.__running[token]
    return true
  }

}

module.exports = sos_lib_profiler
