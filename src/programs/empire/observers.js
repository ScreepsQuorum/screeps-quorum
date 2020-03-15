'use strict'

class EmpireObservers extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_EMPIRE_INTEL
  }

  main () {
    if (Game.rooms.sim) {
      return
    }
    const cities = Room.getCities()
    this.targets = []
    for (const cityName of cities) {
      const city = Game.rooms[cityName]
      if (!city.structures[STRUCTURE_OBSERVER] || city.structures[STRUCTURE_OBSERVER].length < 1) {
        continue
      }
      const observer = city.structures[STRUCTURE_OBSERVER][0]
      const activeTarget = this.getActiveTarget(observer)
      if (activeTarget) {
        this.targets.push(activeTarget)
        observer.observeRoom(activeTarget)
        continue
      }
      const randomTarget = this.getPassiveTarget(observer)
      if (randomTarget) {
        this.targets.push(randomTarget)
        observer.observeRoom(randomTarget)
      }
    }
  }

  getActiveTarget (observer) {
    const target = observer.getActiveTarget()
    if (this.validateTarget(target)) {
      return target
    }
    return false
  }

  getPassiveTarget (observer) {
    let passiveTarget
    do {
      passiveTarget = Room.getRandomRoomInRange(observer.room.name, 10)
    } while (!this.validateTarget(passiveTarget))
    return passiveTarget
  }

  validateTarget (target) {
    if (Game.rooms[target] && Game.rooms[target].controller && Game.rooms[target].controller.my) {
      return false
    }
    return !this.targets.includes(target)
  }
}

module.exports = EmpireObservers
