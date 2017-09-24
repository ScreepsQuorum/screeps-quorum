
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

  // See if creep can get energy from storage, or as a fallback from terminal.
  let storage = false
  if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY]) {
    storage = this.room.storage
  } else if (this.room.terminal && this.room.terminal.store[RESOURCE_ENERGY]) {
    storage = this.room.terminal
  }
  if (storage) {
    if (!this.pos.isNearTo(storage)) {
      this.moveTo(storage)
    }
    if (this.pos.isNearTo(storage)) {
      this.withdraw(storage, RESOURCE_ENERGY)
    }
    return true
  }

  // If there is no storage check for containers.
  const containers = _.filter(this.room.structures[STRUCTURE_CONTAINER], (a) => a.store[RESOURCE_ENERGY] > 200)
  if (containers.length > 0) {
    const container = this.pos.findClosestByRange(containers)
    if (!this.pos.isNearTo(container)) {
      this.moveTo(container)
    }
    if (this.pos.isNearTo(container)) {
      this.withdraw(container, RESOURCE_ENERGY)
    }
    return true
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
