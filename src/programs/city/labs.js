'use strict'

class CityLabs extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CITY_LABS
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]
    if (!this.room.structures[STRUCTURE_LAB] || !this.room.getRoomSetting('LABS')) {
      return this.suicide()
    }

    const limit = 2
    let run = 0
    const feeders = this.room.getFeederLabs()

    if (!feeders[0].mineralAmount || feeders[0].mineralAmount < LAB_REACTION_AMOUNT) {
      return
    }
    if (!feeders[1].mineralAmount || feeders[1].mineralAmount < LAB_REACTION_AMOUNT) {
      return
    }

    const vats = this.room.getVatLabs()
    if (!feeders || !vats) {
      return
    }
    if (!feeders[0].mineralType || !feeders[1].mineralType) {
      return
    }
    const product = REACTIONS[feeders[0].mineralType][feeders[1].mineralType]
    for (const vat of vats) {
      if (vat.cooldown) {
        continue
      }
      if (vat.mineralAmount > 0) {
        if (vat.mineralType !== product) {
          continue
        }
        if (vat.mineralCapacity - vat.mineralAmount < LAB_REACTION_AMOUNT) {
          continue
        }
      }
      vat.runReaction(feeders[0], feeders[1])
      run++
      if (run >= limit) {
        break
      }
    }
  }
}

module.exports = CityLabs
