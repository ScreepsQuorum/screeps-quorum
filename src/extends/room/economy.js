'use strict'

global.ECONOMY_CRASHED = 0
global.ECONOMY_FALTERING = 1
global.ECONOMY_DEVELOPING = 2
global.ECONOMY_STABLE = 3
global.ECONOMY_SURPLUS = 4
global.ECONOMY_BURSTING = 5

const economySettings = {
  'SUPPLY_TERMINAL': ECONOMY_FALTERING,

  'EXPAND_FROM': ECONOMY_DEVELOPING,
  'WALLBUILDERS': ECONOMY_DEVELOPING,
  'BUILD_STRUCTURES': ECONOMY_DEVELOPING,

  'EXTRACT_MINERALS': ECONOMY_STABLE,
  'UPGRADE_CONTROLLERS': ECONOMY_STABLE,

  'EXTRA_UPGRADERS': ECONOMY_SURPLUS,
  'EXTRA_WALLBUILDERS': ECONOMY_SURPLUS,

  'MORE_EXTRA_UPGRADERS': ECONOMY_BURSTING
}

Room.prototype.isEconomyCapable = function (key) {
  if (!economySettings[key]) {
    return false
  }
  return this.getEconomyLevel() >= economySettings[key]
}

Room.prototype.getEconomyLevel = function () {
  if (this.getPracticalRoomLevel() < 4) {
    return ECONOMY_STABLE
  }

  const desiredBuffer = this.getDesiredEnergyBuffer()
  const energy = this.getEnergyAmount()

  if (energy < 15000) {
    return ECONOMY_CRASHED
  }

  // When fully developed between 15000 and 280000
  if (energy < (desiredBuffer - 20000)) {
    return ECONOMY_FALTERING
  }

  // When fully developed between 280000 and 300000
  if (energy < (desiredBuffer)) {
    return ECONOMY_DEVELOPING
  }

  // When fully developed between 300000 and 320000
  if (energy < (desiredBuffer + 20000)) {
    return ECONOMY_STABLE
  }

  // Need to ditch energy as we have way too much in storage
  if (_.sum(this.storage.storage) > this.storage.storeCapacity * 0.9) {
    return ECONOMY_BURSTING
  }

  // When fully developed over 320000
  return ECONOMY_SURPLUS
}

Room.prototype.getEnergyAmount = function () {
  let energy = 0
  if (this.storage && this.storage.store[RESOURCE_ENERGY]) {
    energy += this.storage.store[RESOURCE_ENERGY]
  }
  if (this.terminal && this.terminal.store[RESOURCE_ENERGY]) {
    energy += this.terminal.store[RESOURCE_ENERGY]
  }
  return energy
}

Room.prototype.getDesiredEnergyBuffer = function () {
  const roomLevel = this.getPracticalRoomLevel()
  if (roomLevel < 4) {
    return 0
  }
  if (this.name === 'sim') {
    return 40000
  }
  return Math.min((roomLevel - 3) * 100000, 300000)
}
