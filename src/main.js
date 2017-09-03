'use strict'

if(Game.cpu.bucket < 500) {
  throw new Error('Extremely low bucket - aborting script run at top level')
}


// Load any prototypes or libraries

/* Get Upload Version */
require('version')

/* Enable QOS Logger */
var QosLogger = require('qos_logger')
global.Logger = new QosLogger()

/* Add "sos library" - https://github.com/ScreepsOS/sos-library */
global.SOS_LIB_PREFIX = 'thirdparty_'
global.sos_lib = require('thirdparty_sos_lib')

/* Add "creep talk" library - https://github.com/screepers/creeptalk */
var language = require('thirdparty_creeptalk_emoji')
require('thirdparty_creeptalk')({'public': true, 'language': language})

require('extends_creep')
require('extends_room')

var QosKernel = require('qos_kernel')

module.exports.loop = function () {
  var kernal = new QosKernel()
  kernal.start()
  kernal.run()
  kernal.shutdown()
}
