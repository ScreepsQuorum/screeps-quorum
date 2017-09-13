/**
 *
 */

class CityConstruct extends kernel.process {
  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    if (!this.room.isMissingStructures()) {
      return
    }

    var sites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {filter: function (site) {
      return site.structureType != STRUCTURE_ROAD && site.structureType != STRUCTURE_CONTAINER
    }})
    if (sites.length <= 0) {
      this.room.constructNextMissingStructure()
    }

    if (sites.length > 0) {
      this.launchCreepProcess('builders', 'builder', this.data.room, 2)
    }
  }
}

module.exports = CityConstruct
