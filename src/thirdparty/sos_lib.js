'use strict'

if(!Memory.sos) {
  Memory.sos = {}
}

let target = {};

let handler = {
    get(target, key, receiver) {
      var classname = 'sos_lib_' + key
      if(!!global.SOS_LIB_PREFIX) {
        classname = SOS_LIB_PREFIX + classname
      }
      if(!target[classname]) {
        target[classname] = require(classname)
      }
      return target[classname]
    }
};

if (!global.sos) {
  global.sos = {}
}

global.sos.lib = new Proxy({}, handler);
module.exports = global.sos.lib
