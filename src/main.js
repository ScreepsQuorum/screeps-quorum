'use strict'

if (Game.cpu.bucket < 500) {
  throw new Error('Extremely low bucket - aborting script run at top level')
}

// Load any prototypes or libraries

/* Get Upload Version */
require('version')
require('./constants')

/* Enable QOS Logger */
const QosLogger = require('qos_logger')
global.Logger = new QosLogger()

/* Add "sos library" - https://github.com/ScreepsOS/sos-library */
global.SOS_LIB_PREFIX = 'thirdparty_'
global.sos_lib = require('thirdparty_sos_lib')

/* Add additional room visualizations - https://github.com/screepers/RoomVisual */
require('thirdparty_roomvisual')

/* Add "creep talk" library - https://github.com/screepers/creeptalk */
const language = require('thirdparty_creeptalk_emoji')
require('thirdparty_creeptalk')({
  public: true,
  language: language
})

/* Make the quorum library code available globally */
global.qlib = require('lib_loader')

/* Extend built in objects */
require('extends_controller')
require('extends_creep')
require('extends_creep_actions')
require('extends_creep_movement')
require('extends_creep_overrides')
require('extends_lab')
require('extends_mineral')
require('extends_observer')
require('extends_room_alchemy')
require('extends_room_conflict')
require('extends_room_construction')
require('extends_room_control')
require('extends_room_economy')
require('extends_room_intel')
require('extends_room_logistics')
require('extends_room_landmarks')
require('extends_room_meta')
require('extends_room_movement')
require('extends_room_spawning')
require('extends_room_structures')
require('extends_room_territory')
require('extends_roomposition')
require('extends_terminal')
require('extends_source')
require('extends_storage')

const QosKernel = require('qos_kernel')

module.exports.loop = function () {
  if (Game.cpu.bucket < 500) {
    if (Game.cpu.limit !== 0) {
      Logger.log('Extremely low bucket - aborting script run at start of loop', LOG_FATAL)
    }
    return
  }
  const kernel = new QosKernel()
  kernel.start()
  global.Empire = new qlib.Empire()
  kernel.run()
  kernel.shutdown()
}
