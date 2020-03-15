'use strict'

global.ECONOMY_CRASHED = 0
global.ECONOMY_FALTERING = 1
global.ECONOMY_DEVELOPING = 2
global.ECONOMY_STABLE = 3
global.ECONOMY_SURPLUS = 4
global.ECONOMY_BURSTING = 5

// Will return true for economic levels at or above these values.
const economySettings = {
  SUPPLY_TERMINAL: ECONOMY_FALTERING,
  MAINTAIN_STRUCTURES: ECONOMY_FALTERING,
  REMOTE_MINES: ECONOMY_FALTERING,

  EXPAND_FROM: ECONOMY_DEVELOPING,
  BUILD_STRUCTURES: ECONOMY_DEVELOPING,

  EXTRACT_MINERALS: ECONOMY_STABLE,
  UPGRADE_CONTROLLERS: ECONOMY_STABLE,
  WALLBUILDERS: ECONOMY_STABLE,

  EXTRA_UPGRADERS: ECONOMY_SURPLUS,
  SHARE_ENERGY: ECONOMY_SURPLUS,

  EXTRA_WALLBUILDERS: ECONOMY_BURSTING,
  MORE_EXTRA_UPGRADERS: ECONOMY_BURSTING,
  DUMP_ENERGY: ECONOMY_BURSTING
}

// When the room is at RCL8 (not PRL8) use these settings.
const economySettingsLevel8 = {
  EXTRA_UPGRADERS: false,
  MORE_EXTRA_UPGRADERS: false,

  FILL_NUKER: ECONOMY_STABLE,
  FILL_POWER_SPAWN: ECONOMY_STABLE,

  UPGRADE_CONTROLLERS: ECONOMY_SURPLUS,
  EXTRA_WALLBUILDERS: ECONOMY_SURPLUS
}

// Will return true for economic levels at or below these values.
const economyNegativeSettings = {
  REQUEST_ENERGY: ECONOMY_FALTERING
}

Room.prototype.isEconomyCapable = function (key) {
  if (this.controller.level === 8) {
    if (typeof economySettingsLevel8[key] !== 'undefined') {
      if (Number.isInteger(economySettingsLevel8[key])) {
        return this.getEconomyLevel() >= economySettingsLevel8[key]
      } else {
        return false
      }
    }
  }
  if (Number.isInteger(economySettings[key])) {
    return this.getEconomyLevel() >= economySettings[key]
  }
  if (Number.isInteger(economyNegativeSettings[key])) {
    return this.getEconomyLevel() <= economyNegativeSettings[key]
  }
  return false
}

Room.prototype.getEconomyLevel = function () {
  if (this.getPracticalRoomLevel() < 4) {
    return ECONOMY_STABLE
  }

  const desiredBuffer = this.getDesiredEnergyBuffer()
  const energy = this.getEnergyAmount()

  if (energy < 20000) {
    return ECONOMY_CRASHED
  }

  // When fully developed between 20,000 and 200,000
  if (energy < (desiredBuffer - 100000)) {
    return ECONOMY_FALTERING
  }

  // When fully developed between 200,000 and 300,000
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
  return Math.max(Math.min((roomLevel - 3) * 100000, 300000), 150000)
}

Room.prototype.getSinkLinks = function () {
  if (this.__linksinks) {
    return this.__linksinks
  }
  const links = this.structures[STRUCTURE_LINK]
  const storageLink = this.storage ? this.storage.getLink() : false
  const sources = this.find(FIND_SOURCES)
  const sinks = []
  for (const link of links) {
    if (storageLink && storageLink.id === link.id) {
      continue
    }
    if (link.pos.getRangeTo(sources[0]) <= 2) {
      continue
    }
    if (sources.length > 1 && link.pos.getRangeTo(sources[1].getMiningPosition()) <= 1) {
      continue
    }
    // Don't include links that don't have room for energy.
    if ((link.energyCapacity - link.energy) < 50) {
      continue
    }
    sinks.push(link)
  }
  sinks.sort((a, b) => a.energy - b.energy)
  // Always put storageLink last.
  if (storageLink) {
    sinks.push(storageLink)
  }
  this.__linksinks = sinks
  return sinks
}
