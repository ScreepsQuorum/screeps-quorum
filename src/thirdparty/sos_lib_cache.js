'use strict';
const lib_lzstring = (global.SOS_LIB_PREFIX ? global.SOS_LIB_PREFIX : '') + 'lib_lzstring'

var cache = {}

var defaultOpts = {
  'persist': false,
  'compress': false,
  'maxttl': false,
  'lastuse': 50,
  'chance': 1
}

cache.__items = {}

cache.get = function (label, opts) {

  if(Array.isArray(label)) {
    label = label.join('.')
  }

  opts = Object.assign({}, defaultOpts, opts);

  if(opts.ttl && opts.chance < 1) {
    var allow_refresh = Math.random() <= opts.chance
  } else {
    var allow_refresh = true
  }

  // "Global Cache"
  if(!!this.__items[label]) {
    if(!!this.__items[label].exp) {
      if(this.__items[label].exp < Game.time) {
        delete this.__items[label]
      }
    }
  }

  if(!!this.__items[label]) {
    if(!opts.ttl || (this.__items[label].tick + opts.ttl) > Game.time) {
      return this.__items[label].d
    }
  }


  // No cached items in memory.
  if(!Memory.sos || !Memory.sos.cache) {
    return
  }


  // Memory Cache
  var item = _.get(Memory.sos.cache, label, undefined)
  //var item = !!Memory.sos.cache[label] ? Memory.sos.cache[label] : false
  if(!!item) {
    if(!!item.exp) {
      if(item.exp < Game.time) {
        //delete Memory.sos.cache[label]
        _.set(Memory.sos.cache, label, undefined)
        return
      }
    }
  }


  var item = _.get(Memory.sos.cache, label, undefined)
  //var item = !!Memory.sos.cache[label] ? Memory.sos.cache[label] : false

  if(!!item) {
    // Advance "lu" cache time
    var lu = Game.time + opts. lastuse
    if(item.lu != lu) {
      item.lu = Game.time + opts.lastuse
      _.set(Memory.sos.cache, label, item)
    }
    if(allow_refresh && (item.tick + opts.ttl) < Game.time) {
      return
    }
    if(!!item.c) {
      var decompressed_label = label + '_' + item.tick
      if(!!this.__decompress[decompressed_label]) {
        return this.__decompress[decompressed_label]
      }

      var uncompressed_data = this.__decompress(item.d)
      if(!!uncompressed_data) {
        this.__decompress[decompressed_label] = uncompressed_data
      }
      return uncompressed_data
    } else {
      return item.d
    }
  }
}

cache.set = function (label, data, opts = {}) {

  if(Array.isArray(label)) {
    label = label.join('.')
  }

  opts = Object.assign({}, defaultOpts, opts);

  var exp = 0
  if(opts.maxttl) {
    exp = opts.maxttl + Game.time
  }

  if(!opts.persist) {
    this.__items[label] = {
      d: data,
      tick: Game.time,
      exp: exp
    }
    return
  }

  if(this.__decompress[label]) {
    delete this.__decompress[label]
  }

  if(!Memory.sos) {
    return
  }

  if(!Memory.sos.cache) {
    Memory.sos.cache = {}
  }

  var save_item = {
    tick: Game.time,
    lu: Game.time + opts.lastuse
  }

  if(exp) {
    save_item.exp = exp
  }

  if(opts.compress) {
    save_item['c'] = 1
    save_item['d'] = this.__compress(data)
  } else {
    save_item['d'] = data
  }

  _.set(Memory.sos.cache, label, save_item)
  // Memory.sos.cache[label] = save_item
}

cache.clear = function () {
  Memory.sos.cache = {}
}

cache.clean = function () {
  if(!Memory.sos || !Memory.sos.cache) {
    return
  }

  for(var label in Memory.sos.cache) {
    this.__cleankey(Memory.sos.cache, label)
  }

  const globalKeys = Object.keys(this.__items)
  for (const label of globalKeys) {
    if(!!this.__items[label].exp) {
      if(this.__items[label].exp < Game.time) {
        delete this.__items[label]
      }
    }
  }
}

cache.__cleankey = function (object, key) {

  if(object[key].tick) {
    if(object[key].exp && object[key].exp < Game.time) {
      delete object[key]
    } else if(object[key].lu && object[key].lu < Game.time) {
      delete object[key]
    }
  } else {
    for(var label in object[key]) {
      if(object[key][label]) {
        if(object[key][label].tick) {
          if(object[key][label] && object[key][label].exp && object[key][label].exp < Game.time) {
            delete object[key][label]
          } else if(object[key][label] && object[key][label].lu && object[key][label].lu < Game.time) {
            delete object[key][label]
          }
        } else {
          this.__cleankey(object[key], label)
        }
      }
    }
    if(Object.keys(object[key]).length < 0) {
      delete object[key]
    }
  }
}

cache.getOrUpdate = function (label, updateFunc, opts) {
  let result = cache.get(label, opts)
  if (result === undefined) {
    result = updateFunc()
    if (result !== undefined) {
      cache.set(label, result, opts)
    }
  }

  return result
}

cache.__compress = function (value) {
  var LZString = require(lib_lzstring)
  return LZString.compressToUTF16(JSON.stringify(value))
}

cache.__decompress = function (value) {
  try {
    var LZString = require(lib_lzstring)
    var decompressed = LZString.decompressFromUTF16(value)
    var data = JSON.parse(decompressed)
    return data
  } catch (err) {
    return
  }
}

module.exports = cache
