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
