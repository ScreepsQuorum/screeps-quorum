'use strict'

const SPAWN_DEFAULT_PRIORITY = 4

Room.prototype.queueCreep = function(role, options = {}) {
  let name = role + '_' + sos.lib.counter.get(role).toString(36)

  if (!options.priority) {
    options.priority = SPAWN_DEFAULT_PRIORITY
  }

  if (!Memory.spawnqueue) {
    Memory.spawnqueue = {}
  }
  if (!Memory.spawnqueue.index) {
    Memory.spawnqueue.index = {}
  }
  if (!Memory.spawnqueue.index[this.name]) {
    Memory.spawnqueue.index[this.name] = {}
  }
  if (!options.energy || options.energy > this.energyCapacityAvailable) {
    options.energy = this.energyCapacityAvailable
  }
  options.role = role
  Memory.spawnqueue.index[this.name][name] = options
  return name
}

Room.prototype.getQueuedCreep = function() {
  if (!Memory.spawnqueue) {
    return false
  }
  if (!Memory.spawnqueue.index) {
    return false
  }
  if (!Memory.spawnqueue.index[this.name]) {
    return false
  }

  let creeps = Object.keys(Memory.spawnqueue.index[this.name])
  if (creeps.length < 1) {
    return false
  }
  let that = this
  creeps.sort(function(a, b) {
    let aP = Memory.spawnqueue.index[that.name][a].priority ? Memory.spawnqueue.index[that.name][a].priority : SPAWN_DEFAULT_PRIORITY
    let bP = Memory.spawnqueue.index[that.name][b].priority ? Memory.spawnqueue.index[that.name][b].priority : SPAWN_DEFAULT_PRIORITY
    return aP - bP
  })

  let options = Memory.spawnqueue.index[this.name][creeps[0]]
  let role = Creep.getRole(options.role)
  let build = role.getBuild(options)
  if (Creep.getCost(build) > this.energyAvailable) {
    return false
  }
  options.build = build
  options.name = creeps[0]

  if (!this.queued) {
    this.queued = []
  }
  this.queued.push(options.name)
  delete Memory.spawnqueue.index[this.name][creeps[0]]
  return options
}

Room.prototype.isQueued = function(name) {
  if (!Memory.spawnqueue) {
    return false
  }
  if (!Memory.spawnqueue.index) {
    return false
  }
  if (!Memory.spawnqueue.index[this.name]) {
    return false
  }
  if (Memory.spawnqueue.index[this.name][name]) {
    return true
  }
  return !!this.queued && this.queued.indexOf(name) >= 0
}

Room.isQueued = function(name) {
  if (!Memory.spawnqueue) {
    return false
  }
  if (!Memory.spawnqueue.index) {
    return false
  }
  let spawnrooms = Object.keys(Memory.spawnqueue.index)
  for (let room of spawnrooms) {
    if (Game.rooms[room] && Game.rooms[room].isQueued(name)) {
      return true
    }
  }
  return false
}
