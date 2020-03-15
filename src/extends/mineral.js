'use strict'

// Assumes a desired ratio of two hydrogen per one of every other base mineral.
Mineral.getEmpireRatio = function () {
  if (this.mineralRatio && Game.time === this.mineralRatioSave) {
    return this.mineralRatio
  }
  const rooms = Room.getCities()
  const resources = {}
  let max = 0
  for (const room of rooms) {
    const roomIntel = Room.getIntel(room)
    if (!roomIntel[INTEL_MINERAL]) {
      continue
    }
    const resourceType = roomIntel[INTEL_MINERAL]
    if (!resources[resourceType]) {
      resources[resourceType] = 0
    }
    if (resourceType === RESOURCE_HYDROGEN) {
      resources[resourceType] += 0.5
    } else {
      resources[resourceType] += 1
    }
    if (resources[resourceType] > max) {
      max = resources[resourceType]
    }
  }
  const ratio = {}
  for (const resourceType of MINERALS_EXTRACTABLE) {
    if (!resources[resourceType]) {
      ratio[resourceType] = 0
    } else {
      ratio[resourceType] = resources[resourceType] / max
    }
  }
  this.mineralRatio = ratio
  this.mineralRatioSave = Game.time
  return this.mineralRatio
}

Mineral.getResourceType = function (resource) {
  // Resource Specific
  switch (resource) {
    case RESOURCE_ENERGY:
      return RESOURCE_ENERGY
    case RESOURCE_POWER:
      return RESOURCE_POWER
    case RESOURCE_GHODIUM:
      return RESOURCE_GHODIUM
    case RESOURCE_HYDROXIDE:
      return RESOURCE_HYDROXIDE
    case RESOURCE_ZYNTHIUM_KEANITE:
    case RESOURCE_UTRIUM_LEMERGITE:
      return 'comp'
  }

  // Boost Families
  switch (resource.length) {
    case 1:
      return 'base'
    case 2:
      return 'tier1'
    case 4:
      return 'tier2'
    case 5:
      return 'tier3'
    default:
      return false
  }
}
