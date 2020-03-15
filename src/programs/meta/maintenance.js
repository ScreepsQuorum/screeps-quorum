'use strict'

const TIMEOUT = 75000

class MetaMaintenance extends kernel.process {
  getPriority () {
    return PRIORITIES_MAINTENANCE
  }

  main () {
    if (!Memory.construction) {
      Memory.construction = {}
    }
    this.construction()
  }

  construction () {
    qlib.cluster.clean()
    const memSites = Object.keys(Memory.construction)
    for (const id of memSites) {
      if (!Game.constructionSites[id]) {
        delete Memory.construction[id]
        continue
      }
      if (Game.time - Memory.construction[id] >= TIMEOUT) {
        Game.constructionSites[id].remove()
      }
    }
    const siteIds = Object.keys(Game.constructionSites)
    for (const id of siteIds) {
      if (!Memory.construction[id]) {
        Memory.construction[id] = Game.time
      }
    }
  }
}

module.exports = MetaMaintenance
