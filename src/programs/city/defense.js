'use strict'

/**
 * Provide Room-level Security
 */

class CityDefense extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_DEFENSE
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
    if (hostiles.length > 0) {
      // for now, just shoot closest for each tower
      let tower
      for (tower of towers) {
        if (tower.energy < TOWER_ENERGY_COST) {
          continue
        }
        const closest = _.min(hostiles, c => c.pos.getRangeTo(tower.pos))
        tower.attack(closest)
      }
      return
    }

    const healFunc = (healTarget) => {
      // TODO: clever calculations to avoid overheals
      let tower
      for (tower of towers) {
        tower.heal(healTarget)
      }
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
    const hazardTypes = [ATTACK, RANGED_ATTACK, HEAL, WORK]
    return _.some(hostile.body, b => _.include(hazardTypes, b.type))
  }
}

module.exports = CityDefense
