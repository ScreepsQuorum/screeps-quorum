
// Assumes a desired ratio of two hydrogen per one of every other base mineral.
Mineral.getEmpireRatio = function () {
  if (this.mineralRatio && Game.time === this.mineralRatioSave) {
    return this.mineralRatio
  }
  const rooms = Room.getCities()
  let resources = {}
  let max = 0
  for (let room of rooms) {
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
  let ratio = {}
  for (let resourceType of MINERALS_EXTRACTABLE) {
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
