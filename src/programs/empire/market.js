'use strict'

/**
 * Scans all currently visible rooms and records useful information about them.
 */

const RESERVE_AMOUNT = 5000

class EmpireMarket extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_EMPIRE_MARKET
  }

  main () {
    if (!this.data.sent) {
      this.data.sent = {}
    }

    if (!this.data.lma || Game.time - this.data.lma > TERMINAL_COOLDOWN) {
      this.terminals = _.shuffle(Empire.terminals)
      for (const terminal of this.terminals) {
        this.manageTerminal(terminal)
      }
    }
    if (!this.data.lra || Game.time - this.data.lra >= MARKET_STATS_INTERVAL) {
      this.data.lra = Game.time
      this.recordAverages()
    }
  }

  manageTerminal (terminal) {
    if (terminal.cooldown || terminal.store[RESOURCE_ENERGY] < 1000) {
      return false
    }

    // Check to see if terminal should send energy to other cities.
    if (this.shouldSendEnergy(terminal)) {
      const energyTarget = this.getEnergyTarget()
      if (energyTarget) {
        // Max cost of sending 1 energy is 1, for a total of two energy.
        const amount = Math.min(5000, terminal.store[RESOURCE_ENERGY] / 2)
        terminal.send(RESOURCE_ENERGY, amount, energyTarget, 'interempire energy transfer')
        return
      }
    }

    // Sell any resources in terminal.
    const carrying = Object.keys(terminal.store)
    for (const resource of carrying) {
      if (resource === RESOURCE_ENERGY) {
        continue
      }

      if (terminal.store[resource] < TERMINAL_MIN_SEND) {
        continue
      }

      // Don't send resources that were recently received.
      if (this.data.sent[terminal.room.name] && this.data.sent[terminal.room.name][resource]) {
        if (Game.time - this.data.sent[terminal.room.name][resource] < 5000) {
          continue
        }
      }

      const resourceType = Mineral.getResourceType(resource)
      if (resourceType === 'tier1' && resourceType === 'tier2') {
        continue
      }

      const useableAmount = terminal.store[resource]

      // Is it needed by storage?
      const storageNeed = terminal.room.storage.getResourceNeed(resource)
      if (storageNeed > 0) {
        continue
      }

      // Is it needed elsehwere in the empire?
      const target = this.getResourceTarget(resource)
      if (target) {
        if (!this.data.sent[target]) {
          this.data.sent[target] = {}
        }
        this.data.sent[target][resource] = Game.time
        terminal.send(resource, Math.min(1000, useableAmount), target, 'interempire resource transfer')
        return
      }

      // Is there more than `buffer` amount?
      if (useableAmount - RESERVE_AMOUNT > 100) {
        qlib.market.sellImmediately(resource, terminal.room, useableAmount - RESERVE_AMOUNT)
        return
      }
    }
  }

  getResourceTarget (resource) {
    const terminals = _.shuffle(this.terminals)
    for (const terminal of terminals) {
      if (!terminal.canReceive(resource)) {
        continue
      }
      const room = terminal.room
      if (!terminal.store[resource] || terminal.store[resource] < RESERVE_AMOUNT) {
        if (room.storage.getResourceNeed(resource)) {
          return room.name
        }
      }
    }
    return false
  }

  getEnergyTarget () {
    // Set lowest level to 8 so RCL8 rooms only get economy support, not GCL support.
    let lowestLevel = 8
    let lowestCity = false
    let lowestLevelProgress = 0
    // Lazy way to ensure specific rooms aren't favored by order added to empire.
    const terminals = _.shuffle(this.terminals)
    for (const terminal of terminals) {
      if (!terminal.canReceive(RESOURCE_ENERGY)) {
        continue
      }
      if (terminal.room.isEconomyCapable('DUMP_ENERGY')) {
        continue
      }

      // If room *needs* energy supply it.
      if (terminal.room.isEconomyCapable('REQUEST_ENERGY')) {
        return terminal.room.name
      }

      // Built up lowest level room.
      // If two rooms are equal level, pick the one closer to the next level.
      const roomLevel = terminal.room.controller.level
      const roomProgress = terminal.room.controller.progress
      if (roomLevel < lowestLevel || (roomLevel === lowestLevel && roomProgress > lowestLevelProgress)) {
        lowestLevel = terminal.room.controller.level
        lowestLevelProgress = terminal.room.controller.progress
        lowestCity = terminal.room.name
      }
    }
    return lowestCity
  }

  shouldSendEnergy (terminal) {
    if (terminal.store[RESOURCE_ENERGY] < 10000) {
      return false
    }
    if (terminal.room.getRoomSetting('SHARE_ENERGY') && terminal.room.isEconomyCapable('SHARE_ENERGY')) {
      return true
    }
    return terminal.room.isEconomyCapable('DUMP_ENERGY')
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
    for (const resource of resources) {
      qlib.market.getAveragePrice(resource, ORDER_BUY)
      qlib.market.getAveragePrice(resource, ORDER_SELL)
    }
  }
}

module.exports = EmpireMarket
