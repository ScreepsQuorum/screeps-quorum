'use strict'

// Memory.territory

Room.getCities = function () {
  // When respawning the first room has to be autodetected, after which new cities will need to added.
  if (!Memory.territory) {
    Memory.territory = {}
    for (let roomName of Object.keys(Game.rooms)) {
      const room = Game.rooms[roomName]
      if (room.controller && room.controller.my) {
        Memory.territory[roomName] = {}
      }
    }
  }
  return Object.keys(Memory.territory)
}

Room.addCity = function (roomName) {
  Memory.territory[roomName] = {}
  Logger.log(`Adding city ${roomName}`)
  qlib.events.recordEvent('addcity')
}

Room.prototype.getMines = function () {
  if (!Memory.territory || !Memory.territory[this.name]) {
    return []
  }
  if (!Memory.territory[this.name].mines) {
    return []
  }
  return Memory.territory[this.name].mines
}

Room.prototype.addMine = function (mine) {
  if (!Memory.territory || !Memory.territory[this.name]) {
    return false
  }
  if (!Memory.territory[this.name].mines) {
    Memory.territory[this.name].mines = []
  }
  Memory.territory[this.name].mines.push(mine)
  Logger.log(`Adding mine from ${this.name} to ${mine}`)
  qlib.events.recordEvent('addmine')
}

Room.getMineOwner = function (mine) {
  if (!Memory.territory) {
    return false
  }
  if (!this.mineMap) {
    this.mineMap = {}
  } else if (this.mineMap[mine]) {
    return this.mineMap[mine]
  }
  const roomNames = Object.keys(Memory.territory)
  let roomName
  for (roomName of roomNames) {
    if (!Memory.territory[roomName] || !Memory.territory[roomName].mines) {
      continue
    }
    if (Memory.territory[roomName].mines.indexOf(mine) >= 0) {
      this.mineMap[mine] = roomName
      return roomName
    }
  }
  this.mineMap[mine] = false
  return false
}

// All scores are normalized to values between 0 and 1 before having the weight applies to them.
// Weights can be set to negative values to act as a penality.
const MINE_WEIGHTS_SOURCES = 5
const MINE_WEIGHTS_SWAMPINESS = -1
const MINE_WEIGHTS_WALKABILITY = 0
const MINE_WEIGHTS_DISTANCE = -3
const MINE_MAX_DISTANCE = 2

Room.prototype.selectNextMine = function () {
  const existing = this.getMines()
  // The first mine should not be more than one room away
  const candidates = Room.getRoomsInRange(this.name, existing.length <= 0 ? 1 : 2)
  let candidate
  let currentScore = -Infinity
  let currentBestRoom = false
  for (candidate of candidates) {
    if (candidate === this.name) {
      continue
    }
    if (existing.indexOf(candidate) >= 0) {
      continue
    }
    let testScore = this.getMineScore(candidate)
    if (testScore === false) {
      continue
    }
    if (testScore > currentScore) {
      currentScore = testScore
      currentBestRoom = candidate
    }
  }
  return currentBestRoom
}

Room.prototype.getMineScore = function (roomName) {
  // Mining program currently doesn't support SK rooms. When support is added make sure to include it in the scoring.
  if (Room.isSourcekeeper(roomName)) {
    return false
  }
  let distance = Game.map.findRoute(this.name, roomName).length
  if (distance > MINE_MAX_DISTANCE) {
    return false
  }
  const intel = Room.getIntel(roomName)
  if (!intel || !intel[INTEL_SOURCES]) {
    return false
  }

  // Don't try to claim another player's mine or room.
  if (intel[INTEL_OWNER]) {
    return false
  }

  // Don't try to add another room's mine to this room.
  if (Room.getMineOwner(roomName)) {
    return false
  }

  // As written the INTEL_SOUrCES check should cover this, hoever these were added after so for the current running user
  // this check is required until the intel tills in. This check should be safe to remove a week or so after this code
  // is pushed up.
  if (!intel[INTEL_WALKABILITY] || !intel[INTEL_WALKABILITY]) {
    Room.requestIntel(roomName)
    return false
  }

  let score = 0
  score += (intel[INTEL_SOURCES] / 3) * MINE_WEIGHTS_SOURCES
  score += intel[INTEL_WALKABILITY] * MINE_WEIGHTS_WALKABILITY
  score += intel[INTEL_SWAMPINESS] * MINE_WEIGHTS_SWAMPINESS
  score += (distance / MINE_MAX_DISTANCE) * MINE_WEIGHTS_DISTANCE
  return score
}
