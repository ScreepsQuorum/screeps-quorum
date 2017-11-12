
// Each key corresponds to the current practical room level and contains a separate objects containing settings enabled
// at that level. Each higher level inherits the settings from the level below it.
let roomLevelOptions = {
  1: {
    'UPGRADERS_QUANTITY': 5,
    'RESERVER_COUNT': 0,
    'SCOUTS': true,
    'SKIP_STRUCTURE_ROAD': true,
    'SKIP_STRUCTURE_CONTAINER': true
  },
  2: {},
  3: {
    'PURE_CARRY_FILLERS': true,
    'ADDITIONAL_FILLERS': true,
    'SELF_SUFFICIENT': true,
    'REMOTE_MINES': 1,
    'SKIP_STRUCTURE_CONTAINER': false
  },
  4: {
    'DEDICATED_MINERS': true,
    'ADDITIONAL_FILLERS': false,
    'RESERVER_COUNT': 3,
    'REMOTE_MINES': 2,
    'EXPAND_FROM': true,
    'ALLOW_MINING_SCALEBACK': true,
    'SKIP_STRUCTURE_ROAD': false
  },
  5: {},
  6: {
    'EXTRACT_MINERALS': true,
    'RESERVER_COUNT': 2,
    'UPGRADERS_QUANTITY': 3
  },
  7: {
    'RESERVER_COUNT': 1,
    'ALLOW_MINING_SCALEBACK': false,
    'ALWAYS_SAFEMODE': true
  },
  8: {
    'UPGRADERS_QUANTITY': 1,
    'REMOTE_MINES': 3
  }
}

roomLevelOptions[4]['RAMPART_LEVELS'] = {}
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_PATHWAY] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_EDGE] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_PRIMARY_STRUCTURES] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_SECONDARY_STRUCTURES] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_CONTROLLER] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][RAMPART_GATEWAY] = 0
roomLevelOptions[4]['RAMPART_LEVELS'][WALL_GATEWAY] = 0

roomLevelOptions[5]['RAMPART_LEVELS'] = {}
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_PATHWAY] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_EDGE] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_PRIMARY_STRUCTURES] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_SECONDARY_STRUCTURES] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_CONTROLLER] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][RAMPART_GATEWAY] = 0
roomLevelOptions[5]['RAMPART_LEVELS'][WALL_GATEWAY] = 0

roomLevelOptions[6]['RAMPART_LEVELS'] = {}
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_PATHWAY] = 0
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_EDGE] = 0
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_PRIMARY_STRUCTURES] = 3000000
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_SECONDARY_STRUCTURES] = 0
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_CONTROLLER] = 0
roomLevelOptions[6]['RAMPART_LEVELS'][RAMPART_GATEWAY] = 0
roomLevelOptions[6]['RAMPART_LEVELS'][WALL_GATEWAY] = 0

roomLevelOptions[7]['RAMPART_LEVELS'] = {}
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_PATHWAY] = 0
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_EDGE] = 5000000
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_PRIMARY_STRUCTURES] = 3000000
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_SECONDARY_STRUCTURES] = 0
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_CONTROLLER] = 0
roomLevelOptions[7]['RAMPART_LEVELS'][RAMPART_GATEWAY] = 0
roomLevelOptions[7]['RAMPART_LEVELS'][WALL_GATEWAY] = 0

roomLevelOptions[8]['RAMPART_LEVELS'] = {}
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_PATHWAY] = 300000
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_EDGE] = 30000000
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_PRIMARY_STRUCTURES] = 3000000
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_SECONDARY_STRUCTURES] = 300000
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_CONTROLLER] = 30000000
roomLevelOptions[8]['RAMPART_LEVELS'][RAMPART_GATEWAY] = 0
roomLevelOptions[8]['RAMPART_LEVELS'][WALL_GATEWAY] = 0

// Have each level inherit the settings from the previous level unless already set.
for (let level = 0; level <= 8; level++) {
  for (let addLevel = level - 1; addLevel > 0; addLevel--) {
    const keys = Object.keys(roomLevelOptions[addLevel])
    for (let key of keys) {
      if (typeof roomLevelOptions[level][key] === 'undefined') {
        roomLevelOptions[level][key] = roomLevelOptions[addLevel][key]
      }
    }
  }
}

Room.prototype.getRoomSetting = function (key) {
  const level = this.getPracticalRoomLevel()
  key = key.toUpperCase()
  return roomLevelOptions[level][key] ? roomLevelOptions[level][key] : false
}
