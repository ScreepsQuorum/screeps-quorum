'use strict'

global.ECONOMY_CRASHED = 0
global.ECONOMY_DEVELOPING = 1
global.ECONOMY_STABLE = 2
global.ECONOMY_SURPLUS = 3

const economySettings = {
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
  if (!this.storage) {
    return ECONOMY_STABLE
  }

  const energy = this.getEnergyAmount()

  if (energy < 10000) {
    return ECONOMY_CRASHED
  }

  // Between 10000 and 180000
  if (energy < 180000) {
    return ECONOMY_DEVELOPING
  }

  // Between 180000 and 200000
  if (energy < 200000) {
    return ECONOMY_STABLE
  }

  // Over 200000
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
