'use strict'
const MAX_DATA_EMBED = 2000
const SEGMENT_PREFIX = '__bc_'

module.exports.saveIndexSegment = function (makedefault=true) {

  if(!Memory.sos || !Memory.sos.broadcaster) {
    return false
  }

  if(!Memory.sos.broadcaster.update) {
    return false
  }

  if(!!Memory.sos.broadcaster.lastsave) {
    if(Memory.sos.broadcaster.update < Memory.sos.broadcaster.lastsave) {
      return false
    }
  }

  var segmentdata = {
    api: {
      'version': 'v1.0.0',
      'update': Game.time,
    },
    'channels': {}
  }

  for(var channel in Memory.sos.broadcaster.channels) {
    let data = Memory.sos.broadcaster.channels[channel]
    segmentdata['channels'][channel] = data
  }

  Memory.sos.broadcaster.lastsave = Game.time
  sos.lib.segments.saveObject(SEGMENT_PREFIX + 'public', segmentdata)
  sos.lib.segments.markPublic(SEGMENT_PREFIX + 'public')
  if(makedefault) {
    sos.lib.segments.setDefaultPublic(SEGMENT_PREFIX + 'public')
  }
  return true
}

module.exports.updateChannel = function (channel, data, opts={}) {
  if(!Memory.sos || !Memory.sos.broadcaster) {
    Memory.sos.broadcaster = {
      'channels': {},
    }
  }

  opts.data = data
  if(!(/string|number|boolean/).test(typeof opts.data)) {
    opts.data = JSON.stringify(opts.data)
  }

  if(!!opts.compress) {
    try {
      var LZString = require('lib_lzstring')
      var data =  LZString.compressToUTF16(opts.data)
      if(Math.ceil(data.length / (1024*1024)) < Math.ceil(opts.data.length / (1024*1024))) {
        opts.data = data
      } else {
        delete opts.compress
      }
    } catch (err) {
      delete opts.compress
    }
  }

  // Key is a *label*, not a specific key.
  if(!!opts.key) {
    opts.data = sos.lib.crypto.encrypt(opts.data, opts.key)
    opts.keyid = sos.lib.crypto.getKeyHash(opts.key)
    delete opts.key
  }

  if(opts.data.length > MAX_DATA_EMBED) {
    sos.lib.segments.saveString(SEGMENT_PREFIX + channel, opts.data)
    sos.lib.segments.markPublic(SEGMENT_PREFIX + channel)
    opts.segments = sos.lib.segments.getIndexByLabel(SEGMENT_PREFIX + channel)
    delete opts.data
  } else {
    sos.lib.segments.clear(SEGMENT_PREFIX + channel)
  }

  if(!opts.update) {
    opts.update = Game.time
  }

  Memory.sos.broadcaster.update = Game.time
  Memory.sos.broadcaster.channels[channel] = opts
}

module.exports.resetChannel = function (channel, opts={}) {
  if(!Memory.sos || !Memory.sos.broadcaster) {
    return
  }
  if (!!Memory.sos.broadcaster.channels[channel]) {
    if(!!Memory.sos.broadcaster.channels[channel].segments) {
      sos.lib.segments.clear(SEGMENT_PREFIX + channel)
    }
    delete Memory.sos.broadcaster.channels[channel]
    Memory.sos.broadcaster.update = Game.time
  }
}
