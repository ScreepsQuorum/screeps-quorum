'use strict'

StructureStorage.prototype.getLink = function () {
  if (!this.__link) {
    this.__link = this.pos.getLink()
  }
  return this.__link
}

const needs = {
  'base': 5000, // 8 = 40000
  'tier1': 3000, // 10 = 30000
  'tier2': 3000, // 10 = 30000
  'tier3': 20000, // 10 = 200000
  'OH': 10000, // 1 = 10000
  'comp': 10000, // 2 = 20000
  'G': 5000 // 1 = 5000
}
// max resource storage = 335,000
// amount for energy and overflow = 665,000

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
