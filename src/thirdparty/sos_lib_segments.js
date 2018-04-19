'use strict'

if(!Memory.__segindex) {
  Memory.__segindex = {
    'index': {},
    'savelog': {},
    'buffer': {},
    'ttls': {},
    'clear': [],
    'critical': [],
    'last': 100
  }
}

if(!Memory.__segindex.public) {
  Memory.__segindex.public = []
}

var cache = {}

var sos_lib_segments = {

  maxMemory: 100*1024,
  maxActiveSegments: 10,

  // Start at 19- leave the first 20 for manual assignment
  min: 19,
  max: 99,

  // *If possible* Leave this many segments available after processing.
  free: 3,

  hasSegment: function (label) {
    return !!Memory.__segindex.index[label]
  },

  saveObject: function (label, data) {
    this.saveString(label, JSON.stringify(data))
  },

  saveString: function (label, string) {
    var needed_segments = Math.ceil(string.length/this.maxMemory)
    var ids = this.getIndexByLabel(label, true)
    if(!!RawMemory.segments) {
      var availableSegments = Object.keys(RawMemory.segments)
    } else {
      var availableSegments = []
    }

    if(ids.length > needed_segments) {
      // Mark unused segments for cleaning.
      var unneeded = ids.slice(needed_segments, ids.length)
      Memory.__segindex.clear = Memory.__segindex.clear.concat(unneeded)
      ids = ids.slice(0, needed_segments)
    } else if (ids.length < needed_segments) {
      var diff = needed_segments - ids.length
      for(var i = 0; i<diff; i++) {
        var id = this.getNextId()
        if(!id && id !== 0) {
          return ERR_FULL
        }
        ids.push(id)
      }
    }

    Memory.__segindex.index[label] = {'ids':ids}

    for(var i = 0; i < needed_segments; i++) {
      var start = i * this.maxMemory
      var end = start + this.maxMemory // will end *one before* this value
      var chunk = string.slice(start, end)
      var id = ids[i]
      Memory.__segindex.savelog[id] = Game.time
      if(!cache[Game.time]) {
        cache[Game.time] = {}
      }
      cache[Game.time][label] = chunk
      if(availableSegments.indexOf(id) < 0) {
        Memory.__segindex.buffer[id] = chunk
      } else {
        RawMemory.segments[id] = chunk
      }
    }
  },

  getObject: function (label) {
    var stringdata = this.getString(label)
    if(typeof stringdata == 'string') {
      if(stringdata.length <= 0) {
        return {}
      } else {
        var start = Game.cpu.getUsed()
        var data = JSON.parse(stringdata)
        var parseTime = Game.cpu.getUsed() - start
        console.log('Segment ' + label + ' parse time: ' + parseTime + ' with length ' + stringdata.length)
        if(typeof Stats != 'undefined') {
          Stats.addStat('segments.' + label, {
            'label': label,
            'parseTime': parseTime,
            'length': stringdata.length
          }, true)
        }
        return data
      }
    }
    if(!stringdata || stringdata < 0) {
      return stringdata
    }
    return ERR_NOT_FOUND
  },

  getString: function (label, ttl=3) {
    var ids = this.getIndexByLabel(label, true)
    var datastring = ''
    for(var id of ids) {
      this.requestSegment(id, ttl)
      if(datastring === false || datastring < 0) {
        continue
      }

      if(typeof Memory.__segindex.buffer[id] == 'string') {
        datastring += Memory.__segindex.buffer[id]
        continue
      }

      if(!!RawMemory.segments && typeof RawMemory.segments[id] == 'string') {
        datastring += RawMemory.segments[id]
        continue
      }

      var saveTick = Memory.__segindex.savelog[id]
      if(!!cache[saveTick] && typeof cache[saveTick][id] == 'string') {
        datastring += cache[saveTick][id]
        continue
      }

      datastring = ERR_BUSY
    }
    if (Number.isInteger(datastring) && datastring < 0) {
      Logger.log(`Unable to retrieve "${label}" segments`, LOG_WARN)
    }
    return datastring
  },

  clear: function (label) {
    var ids = this.getIndexByLabel(label)
    Memory.__segindex.clear = Memory.__segindex.clear.concat(ids)
    this.unmarkCritical(label)
    this.unmarkPublic(label)
    delete Memory.__segindex.index[label]
  },

  reserveSegments: function (label, count=1) {
    var ids = this.getIndexByLabel(label)

    if(!ids) {
      ids = []
    }

    if(ids.length > count) {
      var unneeded = ids.slice(count, ids.length)
      Memory.__segindex.clear = Memory.__segindex.clear.concat(unneeded)
      ids = ids.slice(0, count)
    } else if(ids.length < count) {
      var diff = count - ids.length
      for(var i = 0; i<diff; i++) {
        var id = this.getNextId()
        if(!id && id !== 0) {
          return ERR_FULL
        }
        ids.push(id)
      }
    }

    Memory.__segindex.index[label].ids = ids
    return ids
  },

  requestSegment: function (index, ttl=5) {
    Memory.__segindex.ttls[index] = ttl
  },

  unrequestSegment: function (index) {
    delete Memory.__segindex.ttls[index]
  },

  markCritical: function (label) {
    if(Memory.__segindex.critical.indexOf(label) < 0) {
      Memory.__segindex.critical.push(label)
    }
  },

  unmarkCritical: function (label) {
    var index = Memory.__segindex.critical.indexOf(label)
    if(index >= 0) {
      Memory.__segindex.critical.splice(index, 1)
    }
  },

  markPublic: function (label) {
    if(Memory.__segindex.public.indexOf(label) < 0) {
      Memory.__segindex.public.push(label)
    }
  },

  unmarkPublic: function (label) {
    var index = Memory.__segindex.public.indexOf(label)
    if(index >= 0) {
      Memory.__segindex.public.splice(index, 1)
    }
  },

  setDefaultPublic: function (label) {
    var index = this.getIndexByLabel(label)
    if(!index) {
      return index
    }
    if(!index || index.length > 1) {
      // throw error
    }
    RawMemory.setDefaultPublicSegment(index[0])
  },

  getAvailableSegments: function () {
    if(!RawMemory.segments) {
      return []
    }
    var availableSegments = Object.keys(RawMemory.segments).map(Number)
    availableSegments = _.filter(availableSegments, function(a){
      return Number.isInteger(a)
    })
    return availableSegments
  },

  moveToGlobalCache: function () {

    // On a server without memory segments so there is nothing to move.
    if(!RawMemory.setActiveSegments) {
      return
    }

    // Shift segments out of RawSegments so more segments can be saved.
    var availableSegments = this.getAvailableSegments()
    for (var id of availableSegments) {
      // Out of management range.
      if(id < this.min || id > this.max) {
        continue
      }

      // Hasn't been saved yet so don't remove it.
      if(!Memory.__segindex.savelog[id]) {
        continue
      }

      // Something may be trying to clear it- just leave blank.
      if(RawMemory.segments[id] === '') {
        continue
      }

      // Something is trying to clear it- leave for end of tick processing.
      if(Memory.__segindex.clear.includes(id)) {
        continue
      }

      var saveTick = Memory.__segindex.savelog[id]
      if(!cache[saveTick]) {
        cache[saveTick] = {}
      }
      cache[saveTick][id] = RawMemory.segments[id]
      delete RawMemory.segments[id]
    }
  },

  process: function () {
    var availableSegments = this.getAvailableSegments()

    // Build list of critical segments from label.
    var critical = []
    for(var critical_label of Memory.__segindex.critical) {
      var ids = this.getIndexByLabel(critical_label)
      critical = critical.concat(ids)
    }

    // Create list of segments to ask for, starting with the critical ones.
    if(critical.length > this.maxActiveSegments) {
      var segments = _.shuffle(critical.concat([])).slice(0,this.maxActiveSegments)
    } else {
      var segments = critical.concat([])
    }

    // clean available segments
    for(var index in Memory.__segindex.clear) {
      var id = Memory.__segindex.clear[index]
      if(Memory.__segindex.buffer[id]) {
        delete Memory.__segindex.buffer[id]
      }
      if(availableSegments.indexOf(id) >= 0) {
        RawMemory.segments[id] = ''
        delete Memory.__segindex.clear[index]
      }
    }
    Memory.__segindex.clear = _.filter(Memory.__segindex.clear, function(a){
      return Number.isInteger(a)
    })

    // On a server without memory segments, so just keep things in buffer
    // and don't attempt to request real segments.
    if(!RawMemory.setActiveSegments) {
      return
    }

    // Flush buffer where possible, add to request where not

    // Get number of usable segments remaining.
    var currentsegments = this.getAvailableSegments().length
    var usablesegments = 10 - (currentsegments + this.free)

    // Move data from the buffers to segments.
    for(var index in Memory.__segindex.buffer) {
      var id = Number(index)

      // Is the segment active?
      if(availableSegments.indexOf(id) >= 0) {
        RawMemory.segments[id] = Memory.__segindex.buffer[index]
        delete Memory.__segindex.buffer[index]

      // Are there enough free segments to send data?
      } else if(usablesegments > 0) {
        RawMemory.segments[id] = Memory.__segindex.buffer[index]
        delete Memory.__segindex.buffer[index]
        usablesegments--

      // Are there enough free segments on the next tick to reserve some?
      } else if(segments.length < this.maxActiveSegments) {
        segments.push(id)
      }
    }

    for(var index in Memory.__segindex.clear) {
      var id = Number(index)
      if(usablesegments < 1) {
        break
      }
      RawMemory.segments[id] = ''
      delete Memory.__segindex.clear[index]
      usablesegments--
    }

    // Cache all segments in global to make reconstruction easier.
    for (var id of availableSegments) {
      var saveTick = Memory.__segindex.savelog[id]
      if(!saveTick) {
        saveTick = Game.time
        Memory.__segindex.savelog[id] = Game.time
      }
      if(!cache[saveTick]) {
        cache[saveTick] = {}
      }
      cache[saveTick][id] = RawMemory.segments[id]
    }

    // Add requested segments
    if(segments.length < this.maxActiveSegments) {
      var diff = this.maxActiveSegments - segments.length
      var reqs = Object.keys(Memory.__segindex.ttls)
      if(reqs.length > diff) {
        reqs.sort(function(a,b){
          return this.ttl[a] - this.ttl[b]
        }.bind({'ttl':Memory.__segindex.ttls}))
      }
      for(var index of reqs) {
        Memory.__segindex.ttls[index]--
        if(Memory.__segindex.ttls[index] <= 0) {
          delete Memory.__segindex.ttls[index]
          continue
        }
        segments.push(index)
        diff--
        if(diff <= 0) {
          break
        }
      }
    }

    // Add segments which needs to be cleared
    // Replace this by just injecting blind, as that works now
    if(segments.length < this.maxActiveSegments) {
      var diff = this.maxActiveSegments - segments.length
      var clear = Memory.__segindex.clear.concat({})
      if(clear.length > diff) {
        clear = clear.slice(0,diff)
      }
      segments = segments.concat(clear)
    }

    segments = _.filter(_.uniq(segments.map(Number)),function(a){return Number.isInteger(a)})
    if(segments.length > 0) {
      RawMemory.setActiveSegments(segments)
    }

    // Send list of segments to make public
    // setPublicSegments isn't in the sim
    if(!!RawMemory.setPublicSegments) {
      var public_segments = []
      for(var label of Memory.__segindex.public) {
        var segments = this.getIndexByLabel(label)
        if(segments) {
            public_segments = public_segments.concat(segments)
        }
      }
      RawMemory.setPublicSegments(public_segments)
    }
  },

  getNextId: function() {
    var current = Memory.__segindex.last
    if(!current || current > this.max) {
      current = this.min
    }
    var start = current

    var inUse = []
    for(var label in Memory.__segindex.index) {
      inUse = inUse.concat(Memory.__segindex.index[label].ids)
    }
    inUse = inUse.concat(_.values(Memory.__segindex.clear))

    while(true) {
      if(inUse.indexOf(current) < 0) {
        Memory.__segindex.last = +current + +1
        return current
      }
      current++
      if(current > this.max) {
        current = this.min
      }
      if(current == start) {
        return ERR_FULL
      }
    }
  },

  getIndexByLabel: function(label, autoassign=true) {
    if(!!Memory.__segindex.index[label] && !!Memory.__segindex.index[label].ids) {
      return Memory.__segindex.index[label].ids
    }

    if(autoassign) {
      var id = this.getNextId()
      Memory.__segindex.index[label] = {'ids':[id]}
      return Memory.__segindex.index[label].ids.map(Number)
    } else {
      return ERR_NOT_FOUND
    }
  },

  getUsedSegmentList: function () {
    var inUse = []
    for(var label in Memory.__segindex.index) {
      inUse = inUse.concat(Memory.__segindex.index[label].ids)
    }
    inUse = inUse.concat(_.values(Memory.__segindex.clear))
    return inUse
  },

  getUsagePercentage: function (label = false, limitToControlled = true) {
    if(label) {
      var id_list = this.getIndexByLabel(label, false).length
      if(!id_list || id_list <= 0) {
        return 0
      }
      var current = id_list
    } else {
      var current = this.getUsedSegmentList().length
      if(current.length <= 0) {
        return 0
      }
    }
    if(limitToControlled) {
      var max = ((this.max+1) - this.min)
      if(max <= 0) {
        return 1
      }
    } else {
      var max = 100
    }

    return current / max
  },

  clearAll: function (confirm=false) {
    if(!confirm) {
      return false
    }
    Memory.__segindex = {
      'index': {},
      'savelog': {},
      'buffer': {},
      'ttls': {},
      'clear': [],
      'critical': [],
      'last': 100
    }

    // Remove "active" segments for cleaner logic.
    var segkeys = Object.keys(RawMemory.segments)
    for(var key in segkeys) {
      delete RawMemory.segments[key]
    }

    // The first segments should be cleared and made available for used
    // immediately, while the rest get queues.
    var clearnow = 10
    for (var i = this.min; i <= this.max; i++) {
      if(clearnow >= 1) {
        RawMemory.segments[i] = ''
        clearnow--
      } else {
        Memory.__segindex.clear.push(i)
      }
    }
  }
}


module.exports = sos_lib_segments
