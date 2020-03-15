'use strict'

/**
 *
 */

// Any rampart under this value is considered "decaying" and prioritized.
const DECAY_LIMIT = 30000

class CityFortify extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_FORTIFY
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }

    this.room = Game.rooms[this.data.room]
    this.rampartLevels = this.room.getRoomSetting('RAMPART_LEVELS')
    this.defenses = this.room.getDefenseMap()

    // Since the rampart segments aren't garrunteed to be present catch the error for when they are not.
    let planned
    try {
      planned = this.defenses.isPlanned()
    } catch (err) {
      return
    }

    if (!planned) {
      this.defenses.generate()
      this.defenses.save()
      return
    }
    if (Memory.userConfig && Memory.userConfig.visualizeDefenses) {
      this.defenses.visualize()
    }

    if (!this.rampartLevels) {
      return
    }

    if (!_.values(this.rampartLevels).some(a => a > 0)) {
      return
    }

    const target = this.getTarget()
    if (!target) {
      return
    }

    const structureType = this.defenses.getStructureAt(target.pos.x, target.pos.y)
    const desiredHitpoints = this.rampartLevels[structureType]
    const builderCluster = this.getCluster('builders', this.room)

    let quantity = 0
    if (this.room.isEconomyCapable('WALLBUILDERS')) {
      if (target instanceof ConstructionSite || target.hits < desiredHitpoints) {
        quantity += 1
      }
      if (this.room.isEconomyCapable('EXTRA_WALLBUILDERS')) {
        quantity += 2
      }
    }

    builderCluster.sizeCluster('builder', quantity, {
      priority: 5
    })

    builderCluster.forEach(function (builder) {
      if (builder.recharge()) {
        return
      }
      if (builder.pos.getRangeTo(target) > 2) {
        builder.travelTo(target)
      }
      if (builder.pos.getRangeTo(target) <= 3) {
        if (target instanceof ConstructionSite) {
          builder.build(target)
        } else {
          builder.repair(target)
        }
      }
    })
  }

  /*
    Attempts to get new target for the builder creeps to work on, prioritized in this order:
      * Construction sites,
      * Structures below the minimum threshold (to prevent ramparts from timing out),
      * Missing structures,
      * Structure with the lowest percentage of hit points compared to desired amount.
  */
  getTarget () {
    const sites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: function (site) {
        return site.structureType === STRUCTURE_RAMPART || site.structureType === STRUCTURE_WALL
      }
    })
    if (sites.length > 0) {
      return sites[0]
    }

    const targetId = sos.lib.cache.get([this.data.room, 'rampartTarget'], {
      ttl: 50
    })

    if (targetId) {
      const target = Game.getObjectById(targetId)
      if (target) {
        return target
      }
    }

    const structures = this.defenses.getAllStructures()
    const types = Object.keys(structures)
    // Prioritize missing sites based off of type.
    types.sort((a, b) => b - a)

    const missing = []
    const structureMap = {}
    const decaying = []
    for (const type of types) {
      if (!this.rampartLevels[type]) {
        continue
      }
      for (const position of structures[type]) {
        // Don't build structure ramparts unless there's a structure.
        if (type === RAMPART_PRIMARY_STRUCTURES || type === RAMPART_SECONDARY_STRUCTURES) {
          if (position.lookFor(LOOK_STRUCTURES).length <= 0) {
            continue
          }
        }

        const wall = position.getStructureByType(STRUCTURE_WALL)
        if (wall && wall.hits < WALL_HITS_MAX) {
          structureMap[wall.id] = wall.hits / this.rampartLevels[type]
          continue
        }
        const rampart = position.getStructureByType(STRUCTURE_RAMPART)
        if (rampart && rampart.hits < RAMPART_HITS_MAX[this.room.controller.level]) {
          if (rampart.hits <= DECAY_LIMIT) {
            decaying.push(rampart)
          }
          structureMap[rampart.id] = rampart.hits / this.rampartLevels[type]
          continue
        }
        missing.push(position)
      }
    }

    let target
    if (decaying.length > 0) {
      decaying.sort((a, b) => a.hits - b.hits)
      target = decaying[0]
    } else {
      const potentialTargets = Object.keys(structureMap).sort(function (a, b) {
        return structureMap[a] - structureMap[b]
      })
      target = potentialTargets.length > 0 ? Game.getObjectById(potentialTargets[0]) : false
    }
    if (missing.length > 0 && (!target || target.hits > DECAY_LIMIT)) {
      // Add structure
      let type = STRUCTURE_RAMPART
      if (this.defenses.getStructureAt(missing[0].x, missing[0].y) === WALL_GATEWAY) {
        type = STRUCTURE_WALL
      }
      this.room.createConstructionSite(missing[0], type)
      return false
    }
    if (!target) {
      return false
    }
    sos.lib.cache.set([this.data.room, 'rampartTarget'], target.id, {
      persist: true
    })
    return target
  }
}

module.exports = CityFortify
