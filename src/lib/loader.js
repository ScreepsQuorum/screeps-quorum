let target = {} // eslint-disable-line no-unused-vars

let loader = {
  get(target, key, receiver) {
    var classname = 'lib_' + key.toLowerCase()
    if (!target[classname]) {
      target[classname] = require(classname)
    }
    return target[classname]
  },
}

module.exports = new Proxy({}, loader)
