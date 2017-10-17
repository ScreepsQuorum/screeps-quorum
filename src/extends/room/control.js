
// Each key corresponds to the current practical room level and contains a separate objects containing settings enabled
// at that level. Each higher level inherits the settings from the level below it.
let roomLevelOptions = {
  1: {
    'UPGRADERS_QUANTITY': 5,
    'RESERVER_COUNT': 0,
    'SCOUTS': true
  },
  2: {},
  3: {
    'SELF_SUFFICIENT': true,
    'REMOTE_MINES': 1
  },
  4: {
    'DEDICATED_MINERS': true,
    'PURE_CARRY_FILLERS': true,
    'RESERVER_COUNT': 3,
    'REMOTE_MINES': true,
    'EXPAND_FROM': true
  },
  5: {},
  6: {
    'EXTRACT_MINERALS': true,
    'UPGRADERS_QUANTITY': 3,
    'RESERVER_COUNT': 2
  },
  7: {
    'RESERVER_COUNT': 1,
    'REMOTE_MINES': 2
  },
  8: {
    'UPGRADERS_QUANTITY': 1,
    'REMOTE_MINES': 3
  }
}

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
  return roomLevelOptions[level][key] ? roomLevelOptions[level][key] : false
}
