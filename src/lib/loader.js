
let target = {};

let loader = {
    get(target, key, receiver) {
      var classname = 'lib_' + key
      if(!target[classname]) {
        target[classname] = require(classname)
      }
      return target[classname]
    }
};

module.exports = new Proxy({}, loader);
