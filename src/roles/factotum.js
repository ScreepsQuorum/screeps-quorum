'use strict'

const MetaRole = require('roles_meta')

class Factotum extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 800
  }

  getPriority (creep) {
    return PRIORITIES_CREEP_FACTOTUM
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    let build = [MOVE, CARRY, CARRY, CARRY, CARRY]
    return Creep.buildFromTemplate(build, options.energy)
  }

  manageCreep (creep) {
    if (creep.ticksToLive < 50) {
      return creep.recycle()
    }

    if (_.sum(creep.carry) > 0) {
      if (creep.carry[RESOURCE_ENERGY]) {
        this.emptyEnergy(creep)
      } else {
        this.emptyResources(creep)
      }
      return
    }

    const storage = creep.room.storage
    const terminal = creep.room.terminal

    // empty link
    const storageLink = storage.getLink()
    if (storageLink && storageLink.energy) {
      if (creep.pos.isNearTo(storageLink)) {
        creep.withdraw(storageLink, RESOURCE_ENERGY)
      } else {
        creep.travelTo(storageLink)
      }
      return
    }

    if (terminal && terminal.store[RESOURCE_ENERGY] > TERMINAL_ENERGY) {
      const overflow = terminal.store[RESOURCE_ENERGY] - TERMINAL_ENERGY
      const transferAmount = overflow < creep.carryCapacity ? overflow : creep.carryCapacity
      creep.withdraw(terminal, RESOURCE_ENERGY, transferAmount)
      return
    }

    // pick up dropped resources and creep renewal energy
    const suicideBooth = creep.room.getSuicideBooth()
    if (suicideBooth) {
      const resources = suicideBooth.lookFor(LOOK_RESOURCES)
      if (resources.length > 0) {
        creep.pickup(resources[0])
      }
    }

    if (terminal && storage) {
      // Does terminal have something storage needs?
      const terminalResources = _.shuffle(Object.keys(terminal.store))
      for (const resource of terminalResources) {
        if (resource === RESOURCE_ENERGY) {
          continue
        }
        const need = storage.getResourceNeed(resource)
        if (need > 0) {
          const amount = Math.min(need, creep.carryCapacity - creep.carry, terminal.store[resource])
          creep.withdraw(terminal, resource, amount)
          return
        }
      }

      // Does storage have terminal overflow?
      const storageResources = _.shuffle(Object.keys(storage.store))
      for (const resource of storageResources) {
        if (resource === RESOURCE_ENERGY) {
          continue
        }
        const need = storage.getResourceNeed(resource)
        if (need < 0) {
          const amount = Math.min((-need), creep.carryCapacity - creep.carry, terminal.store[resource])
          creep.withdraw(storage, resource, amount)
          return
        }
      }
    }
  }

  emptyEnergy (creep) {
    // fill terminal with energy
    if (creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] < TERMINAL_ENERGY) {
      if (creep.pos.isNearTo(creep.room.terminal)) {
        const need = TERMINAL_ENERGY - creep.room.terminal.store[RESOURCE_ENERGY]
        const amount = need > creep.carry[RESOURCE_ENERGY] ? creep.carry[RESOURCE_ENERGY] : need
        creep.transfer(creep.room.terminal, RESOURCE_ENERGY, amount)
      } else {
        creep.travelTo(creep.room.terminal)
      }
      return
    }

    if (creep.room.structures[STRUCTURE_NUKER] && creep.room.isEconomyCapable('FILL_NUKER')) {
      const nuker = creep.room.structures[STRUCTURE_NUKER][0]
      if (nuker.energy < nuker.energyCapacity) {
        this.dumpEnergyToStructure(creep, nuker)
        return
      }
    }

    if (creep.room.structures[STRUCTURE_POWER_SPAWN] && creep.room.isEconomyCapable('FILL_POWER_SPAWN')) {
      const powerspawn = creep.room.structures[STRUCTURE_POWER_SPAWN][0]
      if (powerspawn.energy < powerspawn.energyCapacity) {
        this.dumpEnergyToStructure(creep, powerspawn)
        return
      }
    }

    // fill storage with energy
    this.dumpEnergyToStructure(creep, creep.room.storage)
  }

  dumpEnergyToStructure (creep, structure) {
    if (creep.pos.isNearTo(structure)) {
      creep.transfer(structure, RESOURCE_ENERGY)
    } else {
      creep.travelTo(structure)
    }
  }

  emptyResources (creep) {
    const resources = _.filter(Object.keys(creep.carry), a => a !== RESOURCE_ENERGY)
    if (resources.length < 1) {
      return false
    }
    const resource = resources[0]

    // If there's no other option just put it all in storage.
    if (!creep.room.terminal) {
      creep.transfer(creep.room.storage, resource)
      return true
    }

    // Put needed resources into storage and excess into terminal.
    const currentNeed = creep.room.storage.getResourceNeed(resource)
    if (currentNeed > 0) {
      const amount = creep.carry[resource] < currentNeed ? creep.carry[resource] : currentNeed
      creep.transfer(creep.room.storage, resource, amount)
    } else {
      creep.transfer(creep.room.terminal, resource)
    }
    return true
  }
}

module.exports = Factotum
