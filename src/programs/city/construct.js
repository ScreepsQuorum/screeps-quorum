'use strict'

/**
 *
 */

const ignoreConstructionSites = [
  STRUCTURE_RAMPART,
  STRUCTURE_WALL,
  STRUCTURE_CONTAINER,
  STRUCTURE_ROAD
]

class CityConstruct extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CONSTRUCTION
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    const sites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {'filter': function (structure) {
      return !ignoreConstructionSites.includes(structure)
    }})
    if (sites.length <= 0) {
      let result = this.room.constructNextMissingStructure()
      if (Number.isInteger(result) && result < 0) {
        Logger.log(`Unable to build next structure: ${result}`, LOG_ERROR)
      }
    }

    if (sites.length > 0 && this.room.isEconomyCapable('BUILD_STRUCTURES')) {
      this.launchCreepProcess('builders', 'builder', this.data.room, 2)
    }
  }
}

module.exports = CityConstruct
