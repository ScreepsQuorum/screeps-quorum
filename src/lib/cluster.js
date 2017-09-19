'use strict'

class Cluster {
  static clean () {
    var clusters = Cluster.listAll()
    for (var clustername of clusters) {
      var cluster = new Cluster(clustername)
      if (cluster.getCreeps().length <= 0) {
        delete Memory.clusters[clustername]
      }
    }
  }

  static listAll () {
    if (!Memory.clusters) {
      return []
    }
    return Object.keys(Memory.clusters)
  }

  constructor (name, room = false) {
    this.name = name
    this.room = room
    if (!Memory.clusters) {
      Memory.clusters = {}
    }
    if (!Memory.clusters[name]) {
      Memory.clusters[name] = {
        'creeps': []
      }
    }
    this.memory = Memory.clusters[name]
    this.creeps = []
    for (var creepname of this.memory.creeps) {
      if (Game.creeps[creepname]) {
        this.creeps.push(Game.creeps[creepname])
        continue
      }
      if (room) {
        if (!room.isQueued(creepname)) {
          this.memory.creeps.indexOf.splice(this.memory.creeps.indexOf(creepname), 1)
        }
      } else if (!Room.isQueued(creepname)) {
        this.memory.creeps.indexOf.splice(this.memory.creeps.indexOf(creepname), 1)
      }
    }
  }

  sizeCluster (role, quantity, options = {}, room = false) {
    if (this.memory.creeps.length >= quantity) {
      return true
    }
    var spawnroom = room || this.room
    while (this.memory.creeps.length < quantity) {
      this.memory.creeps.push(spawnroom.queueCreep(role, options))
    }
    return false
  }

  getCreeps () {
    return this.creeps
  }

  forEach (creepAction) {
    return this.getCreeps().forEach(creepAction)
  }
}

module.exports = Cluster
