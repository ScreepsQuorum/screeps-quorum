
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
      this.travelTo(storage)
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
      this.travelTo(container)
    }
    if (this.pos.isNearTo(container)) {
      this.withdraw(container, RESOURCE_ENERGY)
    }
    return true
  }

  // If there are no containers check for large piles of energy.
  const droppedEnergyPiles = this.room.find(FIND_DROPPED_RESOURCES, {
    filter: { resourceType: RESOURCE_ENERGY }
  })
  if (droppedEnergyPiles.length > 0) {
    const largestPile = _.max(droppedEnergyPiles, (e) => e.amount)
    const distanceToPile = this.pos.getManhattanDistance(largestPile)
    const minimumDecayValue = Math.ceil(largestPile.amount / 1000) * distanceToPile
    const optimisticAmountOnArrive = Math.max(0, largestPile.amount - minimumDecayValue)

    if (optimisticAmountOnArrive >= this.carryCapacity) {
      if (!this.pos.isNearTo(largestPile)) {
        this.travelTo(largestPile)
      }
      if (this.pos.isNearTo(largestPile)) {
        this.pickup(largestPile)
      }
      return true
    }
  }

  // As a last resort harvest energy from the active sources.
  if (this.getActiveBodyparts(WORK) <= 0) {
    // Still returning true because the creep still does need to recharge.
    return true
  }
  const sources = this.room.find(FIND_SOURCES_ACTIVE)
  if (sources.length <= 0) {
    // Still returning true since energy is still needed
    return true
  }

  sources.sort((a, b) => a.pos.getRangeTo(a.room.controller) - b.pos.getRangeTo(b.room.controller))
  const idx = parseInt(this.name[this.name.length - 1], 36)
  const source = sources[idx % sources.length]
  if (!this.pos.isNearTo(source)) {
    this.travelTo(source)
  }
  if (this.pos.isNearTo(source)) {
    this.harvest(source)
  }
  return true
}

Creep.prototype.recycle = function () {
  let storage = this.room.storage
  if (!storage && this.room.terminal) {
    storage = this.room.terminal
  }

  // Empty creep of all resources, dump them in storage.
  if (this.getCarryPercentage() > 0) {
    if (storage) {
      if (this.pos.isNearTo(storage)) {
        this.transferAll(storage)
      } else {
        this.travelTo(storage)
      }
      return
    }
  }

  // No spawn - time to suicide.
  if (!this.room.structures[STRUCTURE_SPAWN]) {
    this.suicide()
    return
  }

  // Identify spawn closest to storage, to make reclaimed energy easier to store.
  let spawn = false
  if (storage) {
    spawn = storage.pos.findClosestByRange(this.room.structures[STRUCTURE_SPAWN])
  } else {
    spawn = this.room.structures[STRUCTURE_SPAWN][0]
  }

  // Pick the location immediately above the spawn and recycle there.
  const suicideBooth = new RoomPosition(spawn.pos.x, spawn.pos.y - 1, spawn.room.name)
  if (this.pos.getRangeTo(suicideBooth) > 0) {
    this.travelTo(suicideBooth)
  } else {
    spawn.recycleCreep(this)
  }
}

Creep.prototype.transferAll = function (target) {
  if (this.getCarryPercentage() <= 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }
  if (!this.pos.isNearTo(target)) {
    return ERR_NOT_IN_RANGE
  }
  const resources = Object.keys(this.carry)
  let resource
  for (resource of resources) {
    if (this.carry[resource] > 0) {
      return this.transfer(target, resource)
    }
  }
  // this line should never get reached
  return false
}
