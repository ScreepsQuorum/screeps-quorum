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

const ticksBetweenScans = 50
const ticksConsideredActive = 150

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

    if (sites.length > 0) {
      this.data.lastactive = Game.time
      if (this.room.isEconomyCapable('BUILD_STRUCTURES')) {
        this.launchCreepProcess('builders', 'builder', this.data.room, 2)
      }
    } else {
      // If we recently scanned *and* the system hasn't built new construction recently abort to save cpu.
      if (this.data.lastscan && Game.time - this.data.lastscan < ticksBetweenScans) {
        if (!this.data.lastactive || Game.time - this.data.lastactive > ticksConsideredActive) {
          return
        }
      }
      let result = this.room.constructNextMissingStructure()
      this.data.lastscan = Game.time
      if (result !== false && result[0] < 0) {
        // result is [code, type, position]
        Logger.log(`Unable to build structure (${result[1]}) in ${this.data.room} at ${result[2]}: ${result[0]}`, LOG_ERROR)
      }
    }
  }
}

module.exports = CityConstruct
