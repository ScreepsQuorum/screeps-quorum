'use strict'

Room.prototype.getSuicideBooth = function () {
  // Make sure there are spawns in the room
  if (!this.structures[STRUCTURE_SPAWN] || !this.structures[STRUCTURE_SPAWN].length) {
    return false
  }

  // Defaults to the first spawn
  let spawn = this.structures[STRUCTURE_SPAWN][0]

  // Identify spawn closest to storage, to make reclaimed energy easier to store.
  if (this.storage) {
    spawn = this.storage.pos.findClosestByRange(this.structures[STRUCTURE_SPAWN])
  }

  // Pick the location immediately above the spawn and recycle there.
  return new RoomPosition(spawn.pos.x - 1, spawn.pos.y, spawn.room.name)
}

Room.prototype.getFactotumHome = function () {
  if (this.storage) {
    return this.getPositionAt(this.storage.pos.x - 1, this.storage.pos.y + 1)
  } else {
    const suicideBooth = this.getSuicideBooth()
    return this.getPositionAt(suicideBooth.pos.x, suicideBooth.pos.y - 1)
  }
}
