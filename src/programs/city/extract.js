'use strict'

/**
 * Extracts minerals from the local room
 */

class CityExtract extends kernel.process {
  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    if (!this.room.getRoomSetting('EXTRACT_MINERALS')) {
      return this.suicide()
    }

    const extractor = this.room.structures[STRUCTURE_EXTRACTOR] ? this.room.structures[STRUCTURE_EXTRACTOR][0] : false
    const mineral = this.room.find(FIND_MINERALS)[0]
    const storage = this.room.terminal ? this.room.terminal : this.room.storage
    const canExtract = extractor && mineral.mineralAmount > 0 && !mineral.ticksToRegeneration
    const frackerCluster = this.getCluster('frackers', this.room)
    const haulerCluster = this.getCluster('haulers', this.room)
    const frackers = frackerCluster.getCreeps()
    const frackersInPlace = _.filter(frackers, function (fracker) {
      return fracker.pos.isNearTo(mineral)
    })
    const frackersToEmpty = _.filter(frackersInPlace, function (fracker) {
      return _.sum(fracker.carry) > 0
    })

    frackerCluster.sizeCluster('fracker', canExtract > 0 ? Math.min(3, extractor.pos.getSteppableAdjacent().length) : 0)
    haulerCluster.sizeCluster('hauler', canExtract > 0 ? 2 : 0)

    frackerCluster.forEach(function (fracker) {
      if (!canExtract) {
        fracker.recycle()
        return
      }
      if (!fracker.pos.isNearTo(extractor)) {
        fracker.travelTo(extractor)
        return
      }
      // Minimize dropped minerals
      if (_.sum(fracker.carry) + fracker.getActiveBodyparts(WORK) * HARVEST_MINERAL_POWER > fracker.carryCapacity) {
        return
      }
      if (!extractor.cooldown) {
        fracker.harvest(mineral)
      }
    })

    haulerCluster.forEach(function (hauler) {
      if (!canExtract || hauler.ticksToLive < 50) {
        hauler.recycle()
        return
      }
      if (hauler.getCarryPercentage() >= 1) {
        if (hauler.pos.isNearTo(storage)) {
          hauler.transferAll(storage)
        } else {
          hauler.travelTo(storage)
        }
        return
      }

      if (frackersToEmpty.length < 1) {
        const rangeToMineral = hauler.pos.getRangeTo(mineral)
        const idealDistance = frackersInPlace.length ? 2 : 5
        if (rangeToMineral < idealDistance) {
          hauler.travelTo(storage)
        } else if (rangeToMineral > idealDistance) {
          hauler.travelTo(mineral)
        }
        return
      }

      const closestExtractor = hauler.pos.findClosestByRange(frackersToEmpty)
      if (closestExtractor && hauler.pos.isNearTo(closestExtractor)) {
        closestExtractor.transfer(hauler, mineral.mineralType)
      }
      frackersToEmpty.sort((a, b) => _.sum(b.carry) - _.sum(a.carry))
      const fullestExtractor = frackersToEmpty[0]
      if (fullestExtractor && !hauler.pos.isNearTo(fullestExtractor)) {
        hauler.travelTo(fullestExtractor)
      }
    })

    // If there is nothing left to extract and the existing creeps have recycled themselves
    if (canExtract) {
      if (frackers.length <= 0 && haulerCluster.getClusterSize() <= 0) {
        this.suicide()
      }
    }
  }
}

module.exports = CityExtract
