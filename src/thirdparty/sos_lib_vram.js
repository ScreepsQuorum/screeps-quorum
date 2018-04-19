'use strict'

var sos_lib_vram = {

  dirty: [],
  cache: {},

  getData: function (key) {

    if(!Memory.sos) {
      return
    }

    if(!Memory.sos.vram) {
      Memory.sos.vram = {
        'm': {}
      }
    }

    if(!Memory.sos.vram.c) {
      Memory.sos.vram.c = {}
    }

    // If in cache validate against memory version
    if(this.cache[key]) {
      if(!Memory.sos.vram.m[key]) {
        delete this.cache[key]
      } else {
        if(this.cache[key].v != Memory.sos.vram.m[key].v) {
          delete this.cache[key]
        }
      }
    }

    // If not in cache pull from memory.
    if(!this.cache[key]) {
      // See if this is the first time it has been set and initialize.
      if(!Memory.sos.vram.m[key] || !sos.lib.segments.hasSegment(key)) {
        Memory.sos.vram.m[key] = {'v':0}
        this.cache[key] = {
          v:0,
          d:{}
        }
        this.markDirty(key)
      }

      // Check memory cache (for "active" data)
      if(!!Memory.sos.vram.c[key] && !!Memory.sos.vram.c[key].d && Memory.sos.vram.m[key].v) {
        this.cache[key] = {
          d: Memory.sos.vram.c[key].d,
          v:Memory.sos.vram.m[key].v
        }
        this.markDirty(key)
        return this.cache[key].d
      }

      var data = sos.lib.segments.getObject(key)
      // Segment not yet available
      if(Number.isInteger(data) && data < 0) {
        return data
      }

      if(!!Memory.sos.vram.m[key] && !!data) {
        this.cache[key] = {
          v:Memory.sos.vram.m[key].v,
          d:data
        }
      }
    }

    return this.cache[key].d
  },

  getVersion: function (key) {
    if(!Memory.sos.vram) {
      return false
    }
    if(!Memory.sos.vram.m[key]) {
      return false
    }

    return Memory.sos.vram.m[key].v
  },

  setActive(key, ttl=15) {
    if(!Memory.sos.vram.c[key]) {
      Memory.sos.vram.c[key] = {}
    }
    var tick = +ttl + +Game.time
    if(!Memory.sos.vram.c[key].t || Memory.sos.vram.c[key].t < tick) {
      Memory.sos.vram.c[key].t = +ttl + +Game.time
    }
  },

  markCritical: function (key) {
    sos.lib.segments.markCritical(key)
  },

  clearData: function (key) {
    if(!!this.cache[key]) {
      delete this.cache[key]
    }
    sos.lib.segments.clear(key)
    if(!!Memory.sos.vram.m[key]) {
      delete Memory.sos.vram.m[key]
    }
  },

  markDirty: function (key) {
    if(this.lastSave == Game.time) {
      // buffer in memory this one tick to prevent multiple json.stringify calls.
      this.setActive(key, 1)
      this.saveData(key, this.cache[key].d)
    } else {
      if(this.dirty.indexOf(key) < 0) {
        this.dirty.push(key)
      }
    }
  },

  saveDirty: function () {
    this.lastSave = Game.time
    for(var key of this.dirty) {
      this.saveData(key, this.cache[key].d)
    }
    this.dirty = []

    if(!Memory.sos.vram || !Memory.sos.vram.c) {
      return
    }

    var keys = Object.keys(Memory.sos.vram.c)
    for(var key of keys) {
      if(!Memory.sos.vram.c[key].d) {
        continue
      }
      if(Memory.sos.vram.c[key].t >= Game.time) {
        continue
      }
      this.saveData(key, Memory.sos.vram.c[key].d)
    }
  },

  saveData: function (key, value) {
    if(!Memory.sos.vram) {
      Memory.sos.vram = {
        'm': {}
      }
    }
    if(!Memory.sos.vram.c) {
      Memory.sos.vram.c = {}
    }

    // Update Version
    if(!Memory.sos.vram.m[key]) {
      Memory.sos.vram.m[key] = {
        v:0
      }
    } else {
      if(Memory.sos.vram.m[key].v >= 99) {
        Memory.sos.vram.m[key].v = 1
      } else {
        Memory.sos.vram.m[key].v++
      }
    }

    // Update Global Cache
    this.cache[key] = {
      v: Memory.sos.vram.m[key].v,
      d: value
    }

    // Check "active" cache.
    if(!!Memory.sos.vram.c[key]) {
      if(Memory.sos.vram.c[key].t >= Game.time) {
        console.log('Saving to cache')
        Memory.sos.vram.c[key].d = value
      } else {
        console.log('Saving segment after timeout')
        sos.lib.segments.saveObject(key, value)
        delete Memory.sos.vram.c[key]
      }
      return
    }
    console.log(`Saving segment ${key}`)
    sos.lib.segments.saveObject(key, value)
  }

}

module.exports = sos_lib_vram
