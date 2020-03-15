'use strict'

Room.prototype.getFeederLabs = function () {
  const cachedFeederIds = sos.lib.cache.get(`${this.name}.feeders`)
  if (cachedFeederIds) {
    const first = Game.getObjectById(cachedFeederIds[0])
    const second = Game.getObjectById(cachedFeederIds[1])
    if (first && second) {
      this.__feeders = [first, second]
    }
  }

  if (this.__feeders) {
    return this.__feeders
  }
  const labs = this.structures[STRUCTURE_LAB]
  if (!labs || labs.length < 3) {
    return false
  }

  const labDistances = {}
  for (const lab of labs) {
    labDistances[lab.id] = 0
    for (const labCheck of labs) {
      labDistances[lab.id] += labCheck.pos.getRangeTo(lab)
    }
  }
  labs.sort(function (a, b) {
    return labDistances[a.id] - labDistances[b.id]
  })

  sos.lib.cache.set(`${this.name}.feeders`, [labs[0].id, labs[1].id])
  this.__feeders = [labs[0], labs[1]]
  return this.__feeders
}

Room.prototype.getVatLabs = function () {
  const labs = this.structures[STRUCTURE_LAB]
  const feeders = this.getFeederLabs()

  if (!feeders) {
    return false
  }

  const vats = []
  for (const lab of labs) {
    if (feeders[0].id === lab.id || feeders[1].id === lab.id) {
      continue
    }
    vats.push(lab)
  }
  return vats
}

Room.prototype.getActiveReaction = function () {
  const reaction = sos.lib.cache.get(`${this.name}.reaction`)
  if (reaction) {
    return reaction
  }
  if (this.__activeReaction) {
    return this.__activeReaction
  }
  this.__activeReaction = this.getNextReaction()
  sos.lib.cache.set(`${this.name}.reaction`, this.__activeReaction, {
    persist: true,
    maxttl: 600
  })
  return this.__activeReaction
}

Room.prototype.getNextReaction = function () {
  if (!this.storage) {
    return false
  }

  const storageByType = this.storage.getContentsByType()

  // Has Catalyst
  if (this.storage.store[RESOURCE_CATALYST] && this.storage.store[RESOURCE_CATALYST] > 1000) {
    if (storageByType.tier2 && storageByType.tier2.length > 0) {
      let need = 0
      let resource = false
      for (const option of storageByType.tier2) {
        if (this.storage.store[option] < 1000) {
          continue
        }
        const product = REACTIONS[option][RESOURCE_CATALYST]
        const productNeed = this.storage.getResourceNeed(product)
        if (!resource || need < productNeed) {
          need = productNeed
          resource = option
        }
      }
      if (resource) {
        return [resource, RESOURCE_CATALYST]
      }
    }
  }

  // Has OH
  if (this.storage.store[RESOURCE_HYDROXIDE] && this.storage.store[RESOURCE_HYDROXIDE] > 1000) {
    if (storageByType.tier1 && storageByType.tier1.length > 0) {
      let need = 0
      let resource = false
      for (const option of storageByType.tier1) {
        if (this.storage.store[option] < 1000) {
          continue
        }
        const nextTier = REACTIONS[option][RESOURCE_HYDROXIDE]
        const product = REACTIONS[nextTier][RESOURCE_CATALYST]
        const productNeed = this.storage.getResourceNeed(product)
        if (!resource || need < productNeed) {
          need = productNeed
          resource = option
        }
      }
      if (resource) {
        return [resource, RESOURCE_HYDROXIDE]
      }
    }
  }

  // Does it need OH?
  if (this.storage.store[RESOURCE_HYDROGEN] >= 1000 && this.storage.store[RESOURCE_OXYGEN] >= 1000) {
    if (!this.storage.store[RESOURCE_HYDROXIDE] || this.storage.store[RESOURCE_HYDROXIDE] <= 2000) {
      return [RESOURCE_HYDROGEN, RESOURCE_OXYGEN]
    }
  }

  // Generate base possibilities.
  const possibilities = []
  if (this.storage.store[RESOURCE_OXYGEN] >= 1000) {
    if (this.storage.store[RESOURCE_ZYNTHIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_OXYGEN][RESOURCE_ZYNTHIUM])
    }
    if (this.storage.store[RESOURCE_UTRIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_OXYGEN][RESOURCE_UTRIUM])
    }
    if (this.storage.store[RESOURCE_LEMERGIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_OXYGEN][RESOURCE_LEMERGIUM])
    }
    if (this.storage.store[RESOURCE_KEANIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_OXYGEN][RESOURCE_KEANIUM])
    }
    if (this.storage.store[RESOURCE_GHODIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_OXYGEN][RESOURCE_GHODIUM])
    }
  }
  if (this.storage.store[RESOURCE_HYDROGEN] >= 1000) {
    if (this.storage.store[RESOURCE_ZYNTHIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_HYDROGEN][RESOURCE_ZYNTHIUM])
    }
    if (this.storage.store[RESOURCE_UTRIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_HYDROGEN][RESOURCE_UTRIUM])
    }
    if (this.storage.store[RESOURCE_LEMERGIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_HYDROGEN][RESOURCE_LEMERGIUM])
    }
    if (this.storage.store[RESOURCE_KEANIUM] >= 1000) {
      possibilities.push(REACTIONS[RESOURCE_HYDROGEN][RESOURCE_KEANIUM])
    }
  }

  // Find the boost that is most needed of all possbilities.
  let need = 0
  let finalProduct = false
  const randomizedPossibilities = _.shuffle(possibilities)
  for (const option of randomizedPossibilities) {
    const nextTier = REACTIONS[option][RESOURCE_HYDROXIDE]
    const product = REACTIONS[nextTier][RESOURCE_CATALYST]
    const productNeed = this.storage.getResourceNeed(product)
    if (need < 0) {
      continue
    }
    if (!product || need < productNeed) {
      need = productNeed
      finalProduct = option
    }
  }
  if (finalProduct) {
    return MINERAL_INGREDIENTS[finalProduct]
  }

  // Should build GH?
  if (this.storage.store[RESOURCE_HYDROGEN] >= 1000 && this.storage.store[RESOURCE_GHODIUM] >= 1000) {
    return [RESOURCE_HYDROGEN, RESOURCE_GHODIUM]
  }

  // Need more G and have the components to build it?
  if (this.storage.store[RESOURCE_UTRIUM_LEMERGITE] >= 1000 && this.storage.store[RESOURCE_ZYNTHIUM_KEANITE] >= 1000) {
    return [RESOURCE_UTRIUM_LEMERGITE, RESOURCE_ZYNTHIUM_KEANITE]
  }

  // Build the components for G.
  const gComponents = _.shuffle(MINERAL_INGREDIENTS[RESOURCE_GHODIUM])
  for (const gComponent of gComponents) {
    if (this.storage.store[gComponent] <= 2000) {
      const primary = MINERAL_INGREDIENTS[gComponent][0]
      const secondary = MINERAL_INGREDIENTS[gComponent][1]
      if (this.storage.store[primary] >= 1000 && this.storage.store[secondary] >= 1000) {
        return [primary, secondary]
      }
    }
  }
  return false
}
