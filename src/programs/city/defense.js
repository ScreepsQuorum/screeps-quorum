'use strict'

/**
 * Provide Room-level Security
 */

class CityDefense extends kernel.process {
  constructor(...args) {
    super(...args)
    this.priority = PRIORITIES_DEFENSE

    // Pre-load all effect values.
    if (
      !global.TOWER_DAMAGE_EFFECT ||
      !global.TOWER_REPAIR_EFFECT ||
      !global.TOWER_HEAL_EFFECT
    ) {
      global.TOWER_DAMAGE_EFFECT = []
      global.TOWER_REPAIR_EFFECT = []
      global.TOWER_HEAL_EFFECT = []

      for (let i = 0; i < 50; i++) {
        global.TOWER_DAMAGE_EFFECT[i] = this.calculateWithFallOff(
          TOWER_POWER_ATTACK,
          i
        )
        global.TOWER_REPAIR_EFFECT[i] = this.calculateWithFallOff(
          TOWER_POWER_REPAIR,
          i
        )
        global.TOWER_HEAL_EFFECT[i] = this.calculateWithFallOff(
          TOWER_POWER_HEAL,
          i
        )
      }
    }
  }

  getDescriptor() {
    return this.data.room
  }

  main() {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }

    const room = Game.rooms[this.data.room]
    const towers = room.structures[STRUCTURE_TOWER]

    const hostiles = room.find(FIND_HOSTILE_CREEPS)

    if (towers && towers.length > 0) {
      this.fireTowers(towers, hostiles)
    }

    if (
      towers &&
      _.some(towers, tower => tower.energy < tower.energyCapacity)
    ) {
      this.launchCreepProcess('loader', 'replenisher', this.data.room, 1)
    }

    const playerHostiles = hostiles.filter(
      c => c.owner.username !== 'Invader' && this.isPotentialHazard(c)
    )

    if (playerHostiles.length > 0) {
      Logger.log(
        `Hostile creep owned by ${
          playerHostiles[0].owner.username
        } detected in room ${this.data.room}.`,
        LOG_WARN
      )
      qlib.notify.send(
        `Hostile creep owned by ${
          playerHostiles[0].owner.username
        } detected in room ${this.data.room}.`,
        1000
      )
      this.safeMode(playerHostiles)
    }
  }

  fireTowers(towers, hostiles) {
    const attackFunc = attackTarget => {
      for (let tower of towers) {
        if (tower.energy < TOWER_ENERGY_COST) {
          continue
        }

        tower.attack(attackTarget)
      }
    }

    const healFunc = healTarget => {
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
      const closestHostile = _.min(hostiles, c =>
        c.pos.getRangeTo(towers[0].pos)
      )
      attackFunc(closestHostile)
      return
    }

    if (this.data.healTarget !== undefined) {
      const healTarget = Game.getObjectById(this.data.healTarget)
      if (
        healTarget &&
        healTarget.pos.roomName === this.data.room &&
        healTarget.hits < healTarget.hitsMax
      ) {
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
      if (!_.isNumber(lowestCreep) && lowestCreep.hits < lowestCreep.hitsMax) {
        this.data.healTarget = lowestCreep.id
        healFunc(lowestCreep)
      }
    }
  }

  safeMode(hostiles) {
    const room = Game.rooms[this.data.room]
    if (room.controller.safeMode && room.controller.safeMode > 0) {
      return true
    }
    if (!room.controller.canSafemode()) {
      return false
    }

    let safeStructures = room.find(FIND_MY_SPAWNS)

    // If there are no spawns this room isn't worth protecting with a safemode.
    if (safeStructures.length <= 0) {
      return false
    }

    // If other rooms are more important than this one save the safemode
    if (!room.getRoomSetting('ALWAYS_SAFEMODE')) {
      const cities = Room.getCities()
      let highestLevel = 0
      for (let cityName of cities) {
        if (!Game.rooms[cityName]) {
          continue
        }
        let city = Game.rooms[cityName]
        if (!city.controller.canSafemode()) {
          continue
        }
        if (city.getRoomSetting('ALWAYS_SAFEMODE')) {
          return false
        }
        let level = city.getPracticalRoomLevel()
        if (highestLevel < level) {
          highestLevel = level
        }
      }
      if (room.getPracticalRoomLevel() < highestLevel) {
        return false
      }
    }

    safeStructures.push(room.controller)
    let structure
    for (structure of safeStructures) {
      const closest = structure.pos.findClosestByRange(hostiles)
      if (structure.pos.getRangeTo(closest) < 5) {
        // Trigger safemode
        if (room.controller.activateSafeMode() === OK) {
          Logger.log(`Activating safemode in ${this.data.room}`, LOG_ERROR)
        }
        return true
      }
    }
    return false
  }

  isPotentialHazard(hostile) {
    const hazardTypes = [ATTACK, RANGED_ATTACK, HEAL, WORK, CLAIM]
    return _.some(hostile.body, b => _.include(hazardTypes, b.type))
  }

  calculateWithFallOff(optimalValue, distance) {
    let effect = optimalValue
    if (distance > TOWER_OPTIMAL_RANGE) {
      if (distance > TOWER_FALLOFF_RANGE) {
        distance = TOWER_FALLOFF_RANGE
      }
      effect -=
        effect *
        TOWER_FALLOFF *
        (distance - TOWER_OPTIMAL_RANGE) /
        (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE)
    }
    return Math.floor(effect)
  }
}

module.exports = CityDefense
