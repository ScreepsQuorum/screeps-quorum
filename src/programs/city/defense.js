'use strict'

/**
 * Provide Room-level Security
 */

class CityDefense extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_DEFENSE

    // Pre-load all effect values.
    if (!global.TOWER_DAMAGE_EFFECT || !global.TOWER_REPAIR_EFFECT || !global.TOWER_HEAL_EFFECT) {
      global.TOWER_DAMAGE_EFFECT = []
      global.TOWER_REPAIR_EFFECT = []
      global.TOWER_HEAL_EFFECT = []

      for (let i = 0; i < 50; i++) {
        global.TOWER_DAMAGE_EFFECT[i] = this.calculateWithFallOff(TOWER_POWER_ATTACK, i)
        global.TOWER_REPAIR_EFFECT[i] = this.calculateWithFallOff(TOWER_POWER_REPAIR, i)
        global.TOWER_HEAL_EFFECT[i] = this.calculateWithFallOff(TOWER_POWER_HEAL, i)
      }
    }
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }

    const room = Game.rooms[this.data.room]

    const towers = sos.lib.cache.getOrUpdate(
        [this.data.room, 'towers'],
        () => room.find(FIND_MY_STRUCTURES, {
          filter: {
            structureType: STRUCTURE_TOWER
          }
        })
        .map(s => s.id), {
          persist: true,
          maxttl: 5000,
          chance: 0.001
        })
      .map(id => Game.getObjectById(id))
      .filter(t => t)

    const hostiles = room.find(FIND_HOSTILE_CREEPS)

    if (towers && towers.length > 0) {
      this.fireTowers(towers, hostiles)
    }

    if (towers && _.some(towers, tower => tower.energy < tower.energyCapacity)) {
      this.launchCreepProcess('loader', 'replenisher', this.data.room, 1)
    }

    const playerHostiles = hostiles.filter(c => c.owner.username !== 'Invader' && this.isPotentialHazard(c))

    if (playerHostiles.length > 0) {
      Logger.log(`Hostile creep owned by ${playerHostiles[0].owner.username} detected in room ${this.data.room}.`, LOG_WARN)
      this.safeMode(playerHostiles)
    }
  }

  fireTowers (towers, hostiles) {
    const attackFunc = (attackTarget) => {
      for (let tower of towers) {
        if (tower.energy < TOWER_ENERGY_COST) {
          continue
        }

        tower.attack(attackTarget)
      }
    }

    const healFunc = (healTarget) => {
      let damage = healTarget.hitsMax - healTarget.hits

      for (let tower of towers) {
        if (damage <= 0) {
          break
        }

        const distance = tower.pos.getRangeTo(healTarget.pos)
        damage -= global.TOWER_HEAL_EFFECT[distance]
        tower.heal(healTarget)
      }
    }

    if (hostiles.length > 0) {
      const closestHostile = _.min(hostiles, c => c.pos.getRangeTo(towers[0].pos))
      attackFunc(closestHostile)
      return
    }

    if (this.data.healTarget !== undefined) {
      const healTarget = Game.getObjectById(this.data.healTarget)
      if (healTarget &&
        (healTarget.pos.roomName === this.data.room) &&
        (healTarget.hits < healTarget.hitsMax)) {
        healFunc(healTarget)
        return
      }

      // heal target no longer valid
      delete this.data.healTarget
    }

    // look for a heal target every healFrequency ticks
    const healFrequency = 5
    if (this.period(healFrequency, 'healTargetSelection')) {
      const room = Game.rooms[this.data.room]
      const myCreeps = room.find(FIND_MY_CREEPS)
      const lowestCreep = _.min(myCreeps, c => c.hits / c.hitsMax)
      if (!_.isNumber(lowestCreep) &&
        (lowestCreep.hits < lowestCreep.hitsMax)) {
        this.data.healTarget = lowestCreep.id
        healFunc(lowestCreep)
      }
    }
  }

  safeMode (hostiles) {
    const room = Game.rooms[this.data.room]
    if (room.controller.safeMode && room.controller.safeMode > 0) {
      return true
    }
    if (room.controller.safeModeAvailable <= 0 || room.controller.safeModeCooldown || room.controller.upgradeBlocked) {
      return false
    }

    let safeStructures = room.find(FIND_MY_SPAWNS)
    safeStructures.push(room.controller)
    let structure
    for (structure of safeStructures) {
      const closest = structure.pos.findClosestByRange(hostiles)
      if (structure.pos.getRangeTo(closest) < 5) {
        // Trigger safemode
        Logger.log(`Activating safemode in ${this.data.room}`, LOG_ERROR)
        room.controller.activateSafeMode()
        return true
      }
    }
    return false
  }

  isPotentialHazard (hostile) {
    const hazardTypes = [ATTACK, RANGED_ATTACK, HEAL, WORK, CLAIM]
    return _.some(hostile.body, b => _.include(hazardTypes, b.type))
  }

  calculateWithFallOff (optimalValue, distance) {
    let effect = optimalValue
    if (distance > TOWER_OPTIMAL_RANGE) {
      if (distance > TOWER_FALLOFF_RANGE) {
        distance = TOWER_FALLOFF_RANGE
      }
      effect -= effect * TOWER_FALLOFF * (distance - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE)
    }
    return Math.floor(effect)
  }
}

module.exports = CityDefense
