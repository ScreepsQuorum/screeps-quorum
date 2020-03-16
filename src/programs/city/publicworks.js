'use strict'

const healthThreshold = 0.8
const maintainStructures = [
  STRUCTURE_ROAD,
  STRUCTURE_CONTAINER
]

class CityPublicWorks extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_PUBLICWORKS
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    const sites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: function (structure) {
        return maintainStructures.includes(structure)
      }
    })
    if (sites.length > 0 && this.room.isEconomyCapable('BUILD_STRUCTURES')) {
      this.launchCreepProcess('builders', 'builder', this.data.room, 1)
    }

    this.towers()
  }

  towers () {
    const towers = this.room.structures[STRUCTURE_TOWER]
    if (!towers || towers.length <= 0) {
      return
    }
    const fullTowers = _.filter(towers, tower => tower.energy > (TOWER_CAPACITY * 0.7))
    if (fullTowers.length <= 0) {
      return
    }
    if (this.room.find(FIND_HOSTILE_CREEPS).length > 0) {
      return
    }
    if (!this.room.isEconomyCapable('MAINTAIN_STRUCTURES')) {
      return
    }
    let lowestHealth = 1
    let lowestStructure = false
    for (const structureType of maintainStructures) {
      const structures = this.room.structures[structureType]
      if (structures) {
        for (const structure of structures) {
          const currentHealth = structure.hits / structure.hitsMax
          if (currentHealth < lowestHealth) {
            lowestHealth = currentHealth
            lowestStructure = structure
          }
        }
      }
    }
    if (lowestHealth < healthThreshold && lowestStructure) {
      _.sample(fullTowers).repair(lowestStructure)
    }
  }
}

module.exports = CityPublicWorks
