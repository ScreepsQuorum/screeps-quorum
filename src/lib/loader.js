'use strict';

let loader = {
    get(target, key, receiver) {
      const classname = 'lib_' + key;
      if(!target[classname]) {
        target[classname] = require(classname);
      }
      return target[classname];
    }
};

module.exports = new Proxy({}, loader);
