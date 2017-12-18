'use strict'

StructureObserver.monitor = function (room, ttm = 5) {
  if (!Memory.observers) {
    Memory.observers = {}
  }
  if (!Memory.observers.monitor) {
    Memory.observers.monitor = {}
  }
  if (!Memory.observers.monitor[room]) {
    Memory.observers.monitor[room] = {
      c: Game.time
    }
  }
  Memory.observers.monitor[room].lr = Game.time
  Memory.observers.monitor[room].ttm = ttm
}

StructureObserver.prototype.getActiveTarget = function () {
  if (!Memory.observers || !Memory.observers.monitor) {
    return false
  }
  const targets = _.shuffle(Object.keys(Memory.observers.monitor))
  const observerRoom = this.room.name
  const target = _.find(targets, function (room) {
    return Game.map.getRoomLinearDistance(room, observerRoom) <= 10
  })
  return target || false
}

if (!StructureObserver.prototype.__observeRoom) {
  StructureObserver.prototype.__observeRoom = StructureObserver.prototype.observeRoom

  StructureObserver.prototype.observeRoom = function (roomname) {
    if (Memory.observers && Memory.observers.monitor && Memory.observers.monitor[roomname]) {
      Memory.observers.monitor[roomname].ttm--
      if (Memory.observers.monitor[roomname].ttm < 1) {
        delete Memory.observers.monitor[roomname]
      }
    }
    const ret = this.__observeRoom(roomname)
    if (ret === OK) {
      Logger.log(`Observing room ${roomname} from ${this.room.name}`, LOG_INFO)
    }
    return ret
  }
}
