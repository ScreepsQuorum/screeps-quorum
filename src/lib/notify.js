'use strict'
/* Make the `Notify` object available globally */
const ScreepsNotify = require('thirdparty_notify')

module.exports.send = function (message, limit = false, groups = false) {
  if (!PUBLIC_ACCOUNT) {
    return
  }
  return ScreepsNotify(message, limit, groups)
}

module.exports.clean = function () {
  ScreepsNotify.cleanHistory(10000)
}
