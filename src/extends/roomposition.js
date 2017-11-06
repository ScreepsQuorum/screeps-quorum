'use strict'

RoomPosition.prototype.getAdjacent = function () {
  const results = []
  const room = Game.rooms[this.roomName]

  // Row -1
  if (this.y - 1 >= 0) {
    if (this.x - 1 >= 0) {
      results.push(room.getPositionAt(this.x - 1, this.y - 1))
    }
    results.push(room.getPositionAt(this.x, this.y - 1))
    if (this.x + 1 <= 49) {
      results.push(room.getPositionAt(this.x + 1, this.y - 1))
    }
  }

  // Row 0
  if (this.x - 1 >= 0) {
    results.push(room.getPositionAt(this.x - 1, this.y))
  }
  // placeholder for "self"
  if (this.x + 1 <= 49) {
    results.push(room.getPositionAt(this.x + 1, this.y))
  }

  // Row +1
  if (this.y + 1 <= 49) {
    if (this.x - 1 >= 0) {
      results.push(room.getPositionAt(this.x - 1, this.y + 1))
    }
    results.push(room.getPositionAt(this.x, this.y + 1))
    if (this.x + 1 <= 49) {
      results.push(room.getPositionAt(this.x + 1, this.y + 1))
    }
  }

  return results
}

RoomPosition.prototype.getSteppableAdjacent = function (includeCreeps = false) {
  return _.filter(this.getAdjacent(), function (pos) {
    return pos.isSteppable(includeCreeps)
  })
}

RoomPosition.prototype.getAdjacentInRange = function (range = 1) {
  const bounds = createBoundingBoxForRange(this.x, this.y, range)
  let positions = []
  for (let x = bounds.left; x <= bounds.right; x++) {
    for (let y = bounds.top; y <= bounds.bottom; y++) {
      positions.push(new RoomPosition(x, y, this.roomName))
    }
  }
  return positions
}

RoomPosition.prototype.getSteppableAdjacentInRange = function (range = 1) {
  const bounds = createBoundingBoxForRange(this.x, this.y, range)
  let positions = []
  let position
  for (let x = bounds.left; x <= bounds.right; x++) {
    for (let y = bounds.top; y <= bounds.bottom; y++) {
      position = new RoomPosition(x, y, this.roomName)
      if (position.isSteppable()) positions.push(position)
    }
  }
  return positions
}

RoomPosition.prototype.isSteppable = function (includeCreeps = false) {
  if (this.getTerrainAt() === 'wall') {
    return false
  }
  const structures = this.lookFor(LOOK_STRUCTURES)
  let structure
  for (structure of structures) {
    if (OBSTACLE_OBJECT_TYPES.indexOf(structure.structureType) >= 0) {
      return false
    }
  }
  if (includeCreeps) {
    if (this.lookFor(LOOK_CREEPS).length > 0) {
      return false
    }
  }
  return true
}

RoomPosition.prototype.getMostOpenNeighbor = function () {
  const steppable = this.getSteppableAdjacent()
  let pos
  let best
  let score = 0
  for (pos of steppable) {
    const posScore = pos.getSteppableAdjacent().length
    if (posScore > score) {
      score = posScore
      best = pos
    }
  }
  return best
}

RoomPosition.prototype.isEdge = function () {
  return this.x === 49 || this.x === 0 || this.y === 49 || this.y === 0
}

RoomPosition.prototype.isExit = function () {
  return this.isEdge() && Game.map.getTerrainAt(this) !== 'wall'
}

RoomPosition.prototype.inFrontOfExit = function () {
  if (this.isEdge()) {
    return false
  }
  const neighbors = this.getAdjacent()
  let neighbor
  for (neighbor of neighbors) {
    if (neighbor.isExit()) {
      return true
    }
  }
  return false
}

RoomPosition.prototype.getTerrainAt = function () {
  return Game.map.getTerrainAt(this)
}

RoomPosition.prototype.getManhattanDistance = function (pos) {
  return Math.abs(this.x - pos.x) + Math.abs(this.y - pos.y)
}

RoomPosition.prototype.serialize = function () {
  return Room.serializeName(this.roomName) + String.fromCharCode(((this.x * 100) + +this.y) + 200)
}

RoomPosition.deserialize = function (string) {
  const roomname = Room.deserializeName(string.slice(0, -1))
  const coordraw = (string.charCodeAt(string.length - 1) - 200)
  const x = Math.floor(coordraw / 100)
  const y = coordraw % 50
  return new RoomPosition(x, y, roomname)
}

RoomPosition.prototype.lookAroundFor = function (type, range = 1) {
  if (!Game.rooms[this.roomName]) {
    return ERR_INVALID_TARGET
  }
  const room = Game.rooms[this.roomName]
  const bounds = createBoundingBoxForRange(this.x, this.y, range)
  return room.lookForAtArea(type, bounds.top, bounds.left, bounds.bottom, bounds.right, true)
}

RoomPosition.prototype.lookAround = function (range = 1) {
  if (!Game.rooms[this.roomName]) {
    return ERR_INVALID_TARGET
  }
  const room = Game.rooms[this.roomName]
  const bounds = createBoundingBoxForRange(this.x, this.y, range)
  return room.lookAtArea(bounds.top, bounds.left, bounds.bottom, bounds.right, true)
}

RoomPosition.prototype.getStructureByType = function (structureType) {
  let structures = this.lookFor(LOOK_STRUCTURES)
  let filteredStructures = _.filter(structures, function (structure) {
    return structure.structureType === structureType
  })
  return filteredStructures.length > 0 ? filteredStructures[0] : false
}

/**
 * Creates a bounding box clamped inside the borders of the room
 * @param {number} x position to get bounds-range from
 * @param {number} y position to get bounds-range from
 * @param {number} range of the bounding box
 * @returns {{left: number, right: number, top: number, bottom: number}}
 */
function createBoundingBoxForRange (x, y, range) {
  const absRange = Math.abs(range)
  const left = Math.min(Math.max(x - absRange, 0), 49)
  const right = Math.max(Math.min(x + absRange, 49), 0)
  const top = Math.min(Math.max(y - absRange, 0), 49)
  const bottom = Math.max(Math.min(y + absRange, 49), 0)
  return {left, right, top, bottom}
}

module.exports = {
  createBoundingBoxForRange
}
