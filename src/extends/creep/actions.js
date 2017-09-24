
Creep.prototype.recharge = function () {
  // Check to see if creep needs to recharge
  if (this.carry[RESOURCE_ENERGY] <= 0) {
    this.memory.recharge = true
  }
  if (this.carry[RESOURCE_ENERGY] >= this.carryCapacity) {
    this.memory.recharge = false
  }
  if (!this.memory.recharge) {
    return false
  }

  // As a last resort harvest energy from the active sources.
  const sources = this.room.find(FIND_SOURCES_ACTIVE)
  sources.sort((a, b) => a.pos.getRangeTo(a.room.controller) - b.pos.getRangeTo(b.room.controller))
  const idx = parseInt(this.name[this.name.length - 1], 36)
  const source = sources[idx % sources.length]
  if (!this.pos.isNearTo(source)) {
    this.moveTo(source)
  }
  if (this.pos.isNearTo(source)) {
    this.harvest(source)
  }
  return true
}
