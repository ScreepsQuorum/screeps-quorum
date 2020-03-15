'use strict'

const roomPrograms = {
  spawns: 'spawns',
  defense: 'city_defense',
  reboot: 'city_reboot',
  works: 'city_publicworks'
}

class City extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CITY
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room] || !Game.rooms[this.data.room].controller.my) {
      Room.removeCity(this.data.room)
      return this.suicide()
    }
    this.room = Game.rooms[this.data.room]

    // Limit how often this program runs, as it can get expensive. We don't want it to be a lower CPU priority, as
    // it needs to run often to be effective. We just don't need it every tick.
    if (this.data.lastrun && Game.time - this.data.lastrun < 10) {
      return
    } else {
      this.data.lastrun = Game.time
    }

    this.manageLevelChanges()
    this.remoteMines()
    this.launchBasicPrograms()
    if (!this.requestAid()) {
      this.launchCorePrograms()
      this.launchCreeps()
    }
  }

  manageLevelChanges () {
    // Detect when room level changes and clear spawnqueue.
    if (!this.data.prl) {
      this.data.prl = this.room.getPracticalRoomLevel()
    }
    const roomLevel = this.room.getPracticalRoomLevel()
    if (this.data.prl !== roomLevel) {
      qlib.notify.send(`${this.data.room} has changed from PRL${this.data.prl} to PRL${roomLevel}`)
      this.data.prl = roomLevel
      this.room.clearSpawnQueue()
    }

    // Notify of room level changes
    if (!this.data.level) {
      this.data.level = this.room.controller.level
    }
    if (this.data.level !== this.room.controller.level) {
      qlib.notify.send(`${this.data.room} has changed from level ${this.data.level} to level ${this.room.controller.level}`)
      this.data.level = this.room.controller.level
    }
  }

  requestAid () {
    if (!this.room.structures[STRUCTURE_SPAWN] || this.room.structures[STRUCTURE_SPAWN].length <= 0) {
      this.launchChildProcess('gethelp', 'empire_expand', {
        colony: this.data.room,
        recover: true
      })
      return true
    }
    return false
  }

  launchBasicPrograms () {
    // Launch children programs
    for (const label in roomPrograms) {
      this.launchChildProcess(label, roomPrograms[label], {
        room: this.data.room
      })
    }

    // Launch mining if all level 2 extensions are build.
    if (this.room.energyCapacityAvailable > 500) {
      this.launchChildProcess('mining', 'city_mine', {
        room: this.data.room
      })
    }

    // If the room isn't planned launch the room layout program, otherwise launch construction program
    const layout = this.room.getLayout()
    if (!layout.isPlanned()) {
      this.launchChildProcess('layout', 'city_layout', {
        room: this.data.room
      })
    } else {
      if (Memory.userConfig && Memory.userConfig.visualizeLayout) {
        layout.visualize()
      }
      this.launchChildProcess('construct', 'city_construct', {
        room: this.data.room
      })
      this.launchChildProcess('fortify', 'city_fortify', {
        room: this.data.room
      })
    }

    // Launch mineral extraction
    if (this.room.isEconomyCapable('EXTRACT_MINERALS') && this.room.getRoomSetting('EXTRACT_MINERALS')) {
      // Note that once the program starts it won't stop until the minerals are mined out regardless of economic
      // conditions.
      const mineral = this.room.find(FIND_MINERALS)[0]
      if (mineral.mineralAmount > 0 && !mineral.ticksToRegeneration) {
        this.launchChildProcess('extraction', 'city_extract', {
          room: this.data.room
        })
      }
    }
  }

  launchCorePrograms () {
    if (this.room.getRoomSetting('LABS')) {
      this.launchChildProcess('labs', 'city_labs', {
        room: this.data.room
      })
    }

    if (this.room.storage && this.room.storage.getLink()) {
      this.launchCreepProcess('factotum', 'factotum', this.data.room)
    }
  }

  remoteMines () {
    const mineCount = this.room.getRoomSetting('REMOTE_MINES')
    const lastAdd = qlib.events.getTimeSinceEvent('addmine')
    if (mineCount && lastAdd >= 2000) {
      let remoteMines = this.room.getMines()
      if (remoteMines.length < mineCount) {
        const cpuUsage = sos.lib.monitor.getPriorityRunStats(PRIORITIES_CREEP_DEFAULT)
        if (cpuUsage && cpuUsage.long <= 1.25) {
          const mine = this.room.selectNextMine()
          if (mine) {
            this.room.addMine(mine)
            remoteMines = this.room.getMines()
          }
        }
      }

      let mineRoomName
      for (mineRoomName of remoteMines) {
        this.launchChildProcess(`mine_${mineRoomName}`, 'city_mine', {
          room: this.data.room,
          mine: mineRoomName
        })
      }
    }
  }

  launchCreeps () {
    // Launch fillers
    const options = {
      priority: 3
    }
    if (this.room.getRoomSetting('PURE_CARRY_FILLERS')) {
      options.carry_only = true
      options.energy = Math.max(Math.min(1600, this.room.energyCapacityAvailable / 2), 400)
    }
    const fillerQuantity = this.room.getRoomSetting('ADDITIONAL_FILLERS') ? 4 : 2
    this.launchCreepProcess('fillers', 'filler', this.data.room, fillerQuantity, options)

    // Launch upgraders
    if (this.room.isEconomyCapable('UPGRADE_CONTROLLERS')) {
      let upgraderQuantity = this.room.getRoomSetting('UPGRADERS_QUANTITY')
      // If the room is not done being built up reduce the upgraders.
      if (this.room.controller.level > this.room.getPracticalRoomLevel()) {
        upgraderQuantity = 0
      }
      if (this.room.isEconomyCapable('EXTRA_UPGRADERS')) {
        upgraderQuantity += 2
      }
      if (this.room.isEconomyCapable('MORE_EXTRA_UPGRADERS')) {
        upgraderQuantity += 2
      }
      if (this.room.controller.level >= 8) {
        upgraderQuantity = 1
      }
      this.launchCreepProcess('upgraders', 'upgrader', this.data.room, upgraderQuantity, {
        priority: 5
      })
    }

    if (this.room.controller.isTimingOut()) {
      this.launchCreepProcess('eupgrader', 'upgrader', this.data.room, 1, {
        priority: 1,
        energy: 200
      })
    }

    // Launch scouts to map out neighboring rooms
    if (this.data.room !== 'sim' && this.room.getRoomSetting('SCOUTS')) {
      this.launchCreepProcess('scouts', 'spook', this.data.room, 1, {
        priority: 4
      })
    }
  }
}

module.exports = City
