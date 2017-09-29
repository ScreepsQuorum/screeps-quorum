'use strict'

global.ECONOMY_CRASHED = 0
global.ECONOMY_DEVELOPING = 1
global.ECONOMY_STABLE = 2
global.ECONOMY_SURPLUS = 3

const economySettings = {
  'BUILD_STRUCTURES': ECONOMY_STABLE,
  'UPGRADE_CONTROLLERS': ECONOMY_STABLE,
  'EXTRA_UPGRADERS': ECONOMY_SURPLUS
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

  // When fully developed between 15000 and 300000
  if (energy < desiredBuffer) {
    return ECONOMY_DEVELOPING
  }

  // When fully developed between 300000 and 320000
  if (energy < (desiredBuffer + 20000)) {
    return ECONOMY_STABLE
  }

  // When fully developed over 300000
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
  return Math.min((roomLevel - 3) * 100000, 300000)
}
