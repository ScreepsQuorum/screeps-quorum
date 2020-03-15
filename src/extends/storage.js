'use strict'

StructureStorage.prototype.getLink = function () {
  if (!this.__link) {
    this.__link = this.pos.getLink()
  }
  return this.__link
}

const needs = {
  base: 10000, // 8 = 80000
  tier1: 3000, // 10 = 30000
  tier2: 3000, // 10 = 30000
  tier3: 20000, // 10 = 200000
  OH: 10000, // 1 = 10000
  comp: 10000, // 2 = 20000
  G: 5000 // 1 = 5000
}
// max resource storage = 375,000
// amount for energy and overflow = 625,000

StructureStorage.prototype.getResourceNeed = function (resource) {
  const type = Mineral.getResourceType(resource)
  if (!needs[type]) {
    return 0
  }

  if (!this.store[resource]) {
    return needs[type]
  }
  return needs[type] - this.store[resource]
}

StructureStorage.prototype.getContentsByType = function () {
  const contents = Object.keys(this.store)
  const byType = {}
  for (const resource of contents) {
    const type = Mineral.getResourceType(resource)
    if (!byType[type]) {
      byType[type] = []
    }
    byType[type].push(resource)
  }
  return byType
}
