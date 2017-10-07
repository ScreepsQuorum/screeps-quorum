'use strict'

/**
 * Scans all currently visible rooms and records useful information about them.
 */

class EmpireMarket extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_EMPIRE_MARKET
  }

  main () {
    if (!this.data.lma || Game.time - this.data.lma > TERMINAL_COOLDOWN) {
      const cities = Room.getCities()
      for (let city of cities) {
        if (Game.rooms[city] && Game.rooms[city].terminal) {
          this.manageTerminal(Game.rooms[city].terminal)
        }
      }
    }
    if (!this.data.lra || Game.time - this.data.lra >= MARKET_STATS_INTERVAL) {
      this.data.lra = Game.time
      this.recordAverages()
    }
  }

  manageTerminal (terminal) {
    if (terminal.cooldown || terminal.store[RESOURCE_ENERGY] <= 100) {
      return false
    }
    const carrying = Object.keys(terminal.store)
    for (let resource of carrying) {
      if (resource === RESOURCE_ENERGY) {
        continue
      }
      qlib.market.sellImmediately(resource, terminal.room, terminal.store[resource])
      break
    }
  }

  recordAverages () {
    const resources = [
      RESOURCE_POWER,
      RESOURCE_HYDROGEN,
      RESOURCE_OXYGEN,
      RESOURCE_UTRIUM,
      RESOURCE_LEMERGIUM,
      RESOURCE_KEANIUM,
      RESOURCE_ZYNTHIUM,
      RESOURCE_CATALYST,
      RESOURCE_GHODIUM,
      RESOURCE_HYDROXIDE,
      RESOURCE_CATALYZED_UTRIUM_ACID,
      RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
      RESOURCE_CATALYZED_KEANIUM_ACID,
      RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
      RESOURCE_CATALYZED_LEMERGIUM_ACID,
      RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
      RESOURCE_CATALYZED_ZYNTHIUM_ACID,
      RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
      RESOURCE_CATALYZED_GHODIUM_ACID,
      RESOURCE_CATALYZED_GHODIUM_ALKALIDE
    ]
    for (let resource of resources) {
      qlib.market.getAveragePrice(resource, ORDER_BUY)
      qlib.market.getAveragePrice(resource, ORDER_SELL)
    }
  }
}

module.exports = EmpireMarket
