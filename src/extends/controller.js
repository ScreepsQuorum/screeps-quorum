'use strict'

StructureController.prototype.getLinkPosition = function () {
  const neighbors = this.pos.getSteppableAdjacent()
  let best = false
  let bestNeighbors = 0
  for (const neighbor of neighbors) {
    neighbor.adjacent = neighbor.getSteppableAdjacent()
    if (neighbor.adjacent.length > bestNeighbors) {
      best = neighbor
      bestNeighbors = neighbor.adjacent.length
    }
  }
  return best.getMostOpenNeighbor(true)
}

StructureController.prototype.getLink = function () {
  if (!this.__link) {
    this.__link = this.pos.getLink()
  }
  return this.__link
}

StructureController.prototype.isTimingOut = function () {
  if (!this.level || !CONTROLLER_DOWNGRADE[this.level]) {
    return false
  }
  return (CONTROLLER_DOWNGRADE[this.level] - this.ticksToDowngrade > 4000) || this.ticksToDowngrade < 4000
}

StructureController.prototype.canSafemode = function () {
  if (!this.level) {
    return false
  }
  if (!this.my) {
    return false
  }
  if (!this.safeModeAvailable) {
    return false
  }
  if (this.safeModeCooldown) {
    return false
  }
  if (this.upgradeBlocked) {
    return false
  }
  if (this.ticksToDowngrade && CONTROLLER_DOWNGRADE[this.level] - this.ticksToDowngrade >= 5000) {
    return false
  }
  return true
}

// Monkey patch unclaim function to send notification.
if (!StructureController.prototype.unclaimOriginal__notifications) {
  StructureController.prototype.unclaimOriginal__notifications = StructureController.prototype.unclaim
  StructureController.prototype.unclaim = function () {
    const ret = this.unclaimOriginal__notifications()
    if (ret === OK) {
      qlib.notify.send(`Unclaimed room ${this.room.name}`)
    }
    return ret
  }
}
