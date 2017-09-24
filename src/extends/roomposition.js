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
