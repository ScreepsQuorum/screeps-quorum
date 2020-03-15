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

    // Destroy all neutral and hostile structures immediately
    if (!this.data.hascleared) {
      const layout = this.room.getLayout()
      const structures = this.room.find(FIND_STRUCTURES)
      const miningPositions = this.room.find(FIND_SOURCES).map(s => s.getMiningPosition())
      this.data.hascleared = true
      for (const structure of structures) {
        if (structure.structureType === STRUCTURE_CONTROLLER) {
          continue
        }
        if (structure.my) {
          continue
        }
        const plannedStructure = layout.getStructureAt(structure.pos.x, structure.pos.y) // If we need a road or a container at this position anyway we just leave it there
        if ((plannedStructure === STRUCTURE_CONTAINER || _.any(miningPositions, p => p.isEqualTo(structure.pos))) && // Is a container planned here?
          (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_ROAD)) { // Roads are built under every container, so we keep them
          continue
        }
        if (plannedStructure === STRUCTURE_ROAD && structure.structureType === STRUCTURE_ROAD) { // We need a road, there is a road... Hmmm... Why don't we use it? ;)
          continue
        }

        this.data.hascleared = false
        Logger.log(`Attempting to destroy structure ${structure.structureType}: ${structure.destroy()}`)
      }
      const sites = this.room.find(FIND_HOSTILE_CONSTRUCTION_SITES)
      for (const site of sites) {
        this.data.hascleared = false
        site.remove()
      }
      return
    }

    const sites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: function (structure) {
        return !ignoreConstructionSites.includes(structure)
      }
    })

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
      const result = this.room.constructNextMissingStructure()
      this.data.lastscan = Game.time
      if (result !== false && result[0] < 0) {
        // result is [code, type, position]
        Logger.log(`Unable to build structure (${result[1]}) in ${this.data.room} at ${result[2]}: ${result[0]}`, LOG_ERROR)
      }
    }
  }
}

module.exports = CityConstruct
