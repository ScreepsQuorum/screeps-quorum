'use strict'

global.SEGMENT_INTEL = 'room_intel'
sos.lib.vram.markCritical(SEGMENT_INTEL)

const maxScoutDistance = 11

// To reduce memory we use short keys for the room objects, so for readability those are mapped to global constants.
global.INTEL_LEVEL = 'l'
global.INTEL_PRACTICAL_LEVEL = 'r'
global.INTEL_OWNER = 'o'
global.INTEL_MINERAL = 'm'
global.INTEL_SOURCES = 's'
global.INTEL_UPDATED = 'u'
global.INTEL_RESOURCE_POSITIONS = 'p'
global.INTEL_WALKABILITY = 'w'
global.INTEL_SWAMPINESS = 'a'
global.INTEL_BLOCKED_EXITS = 'b'

Room.Terrain.prototype.isWalkable = function (x, y) {
  return !(this.get(x, y) & TERRAIN_MASK_WALL)
}

Room.Terrain.prototype.isSwamp = function (x, y) {
  return (this.get(x, y) === TERRAIN_MASK_SWAMP)
}

Room.prototype.saveIntel = function (refresh = false) {
  if (!Memory.intel) {
    Memory.intel = {
      buffer: {},
      targets: {},
      active: {}
    }
  }

  // Pull existing data in order to skip calculating things that never change
  let roominfo
  if (refresh) {
    roominfo = {}
  } else {
    roominfo = this.getIntel({ skipRequest: true })
    if (!roominfo) {
      roominfo = {}
    }
  }

  // Add some random variance to this value to spread out intel expirations
  roominfo[INTEL_UPDATED] = Game.time - _.random(0, 10)

  // Record room owner, level, and blocked exits
  if (this.controller) {
    if (this.controller.owner) {
      roominfo[INTEL_OWNER] = this.controller.owner.username
    } else if (this.controller.reservation) {
      roominfo[INTEL_OWNER] = this.controller.reservation.username
    } else if (roominfo[INTEL_OWNER]) {
      delete roominfo[INTEL_OWNER]
    }
    if (this.controller.level) {
      roominfo[[INTEL_LEVEL]] = this.controller.level
      roominfo[INTEL_PRACTICAL_LEVEL] = this.getPracticalRoomLevel()
    } else if (roominfo[INTEL_LEVEL]) {
      delete roominfo[INTEL_LEVEL]
      delete roominfo[INTEL_PRACTICAL_LEVEL]
    }

    // Detect blocked exits in rooms where walls or ramparts are built.
    const blocked = []
    if (this.structures[STRUCTURE_WALL] || this.structures[STRUCTURE_RAMPART]) {
      const candidates = this.find(FIND_SOURCES)
      candidates.push(this.controller)
      const centerish = this.getPositionAt(25, 25).findClosestByRange(candidates).pos
      const exits = _.values(Game.map.describeExits(this.name))
      const name = this.name
      for (const exit of exits) {
        const targetPos = new RoomPosition(25, 25, exit)
        const path = PathFinder.search(centerish, { pos: targetPos, range: 24 },
          {
            swampCost: 1,
            maxRooms: 2,
            maxCost: 1000,
            roomCallback: function (roomName) {
              if (roomName !== name && roomName !== exit) {
                return false
              }
              return Room.getCostmatrix(roomName, {
                ignoreSourceKeepers: true,
                ignoreCreeps: true,
                ignoreExits: true,
                ignoreRoads: true,
                ignorePortals: true,
                noCache: true
              })
            }
          })
        if (path.incomplete) {
          blocked.push(exit)
        }
      }
    }
    if (blocked.length > 0) {
      roominfo[INTEL_BLOCKED_EXITS] = blocked
    } else if (roominfo[INTEL_BLOCKED_EXITS]) {
      delete roominfo[INTEL_BLOCKED_EXITS]
    }
  }

  // Record static resources - minerals, number of sources, and their locations in SK rooms (for pathfinding)
  const recordResourceLocation = this.structures[STRUCTURE_KEEPER_LAIR] !== undefined

  if (recordResourceLocation) {
    roominfo[INTEL_RESOURCE_POSITIONS] = []
  }
  if (!roominfo[INTEL_MINERAL]) {
    const minerals = this.find(FIND_MINERALS)
    if (minerals.length > 0) {
      roominfo[INTEL_MINERAL] = minerals[0].mineralType
      if (recordResourceLocation) {
        roominfo[INTEL_RESOURCE_POSITIONS].push(minerals[0].pos.serialize())
      }
    }
  }
  if (!roominfo[INTEL_SOURCES]) {
    const sources = this.find(FIND_SOURCES)
    if (sources.length > 0) {
      roominfo[INTEL_SOURCES] = sources.length
      if (recordResourceLocation) {
        let source
        for (source of sources) {
          roominfo[INTEL_RESOURCE_POSITIONS].push(source.pos.serialize())
        }
      }
    }
  }

  // Record terrain details for scoring algorithms
  if (!roominfo[INTEL_SWAMPINESS] || !roominfo[INTEL_WALKABILITY]) {
    let walkable = 0
    let swamps = 0
    let x
    let y
    const terrain = Game.map.getRoomTerrain(this.name)
    for (x = 0; x < 50; x++) {
      for (y = 0; y < 50; y++) {
        if (terrain.isWalkable(x, y)) {
          walkable++
        }
        if (terrain.isSwamp(x, y)) {
          swamps++
        }
      }
    }
    roominfo[INTEL_WALKABILITY] = Math.round((walkable / 2500) * 1000) / 1000
    roominfo[INTEL_SWAMPINESS] = Math.round((swamps / walkable) * 1000) / 1000
  }

  // Record any portal destinations, distinguishing between inter and intra shard.
  /*
  if (this.structures[STRUCTURE_PORTAL] && this.structures[STRUCTURE_PORTAL].length > 0) {
    const portals = this.structures[STRUCTURE_PORTAL]
    let portal
    for (portal of portals) {

    }
  }
  */

  // Remove this room as a scouting target and active assignments
  if (Memory.intel.targets[this.name]) {
    delete Memory.intel.targets[this.name]
  }
  if (Memory.intel.active[this.name]) {
    delete Memory.intel.active[this.name]
  }

  Memory.intel.buffer[this.name] = roominfo
  return roominfo
}

Room.flushIntelToSegment = function () {
  if (!Memory.intel || !Memory.intel.buffer) {
    return
  }
  const rooms = Object.keys(Memory.intel.buffer)
  if (rooms.length <= 0) {
    return
  }
  const intelmap = sos.lib.vram.getData(SEGMENT_INTEL)
  sos.lib.vram.markDirty(SEGMENT_INTEL)
  let roomname
  for (roomname in Memory.intel.buffer) {
    intelmap[roomname] = Memory.intel.buffer[roomname]
    delete Memory.intel.buffer[roomname]
  }
}

Room.getIntel = function (roomname, opts = {}) {
  if (Memory.intel && Memory.intel.buffer[roomname]) {
    return Memory.intel.buffer[roomname]
  }

  const intelmap = sos.lib.vram.getData(SEGMENT_INTEL)
  if (intelmap[roomname]) {
    return intelmap[roomname]
  }

  if (Game.rooms[roomname]) {
    Game.rooms[roomname].saveIntel(true)
    if (Memory.intel && Memory.intel.buffer[roomname]) {
      return Memory.intel.buffer[roomname]
    }
  } else if (qlib.map.getDistanceToEmpire(roomname, 'manhattan') <= 18) {
    Room.requestIntel(roomname)
  }

  return false
}

Room.prototype.getIntel = function (opts = {}) {
  return Room.getIntel(this.name, opts)
}

Room.getResourcesPositions = function (roomname) {
  const roominfo = Room.getIntel(roomname)
  if (!roominfo[INTEL_RESOURCE_POSITIONS]) {
    return false
  }
  const positions = []
  let serializedPosition
  for (serializedPosition of roominfo[INTEL_RESOURCE_POSITIONS]) {
    positions.push(RoomPosition.deserialize(serializedPosition))
  }
  return positions
}

Room.requestIntel = function (roomname) {
  if (Game.rooms[roomname]) {
    Game.rooms[roomname].saveIntel()
    return
  }
  if (!Game.map.isRoomAvailable(roomname)) {
    return
  }
  if (!qlib.map.reachableFromEmpire(roomname, 'manhattan')) {
    return
  }
  if (!Memory.intel) {
    Memory.intel = {
      buffer: {},
      targets: {},
      active: {}
    }
  }

  // Hard limit on MAX_INTEL_TARGETS rooms targetted to prevent memory leak.
  const current = Object.keys(Memory.intel.targets)
  if (current.length >= MAX_INTEL_TARGETS) {
    return
  }
  if (!Memory.intel.targets[roomname]) {
    Memory.intel.targets[roomname] = Game.time
  }
}

Room.getScoutTarget = function (creep) {
  let target = false
  let targetRooms = !Memory.intel ? [] : _.shuffle(Object.keys(Memory.intel.targets))
  const assignedRooms = !Memory.intel ? [] : Object.keys(Memory.intel.active)

  // In case target room cleanup failed manually clear it instead of wasting cpu.
  if (targetRooms.length > (MAX_INTEL_TARGETS * 2)) {
    Memory.intel.targets = {}
    targetRooms = []
  }

  if (targetRooms.length > 0) {
    let oldest = false
    let testRoom
    for (testRoom of targetRooms) {
      // Filter out invalid rooms
      if (!Game.map.isRoomAvailable(testRoom)) {
        continue
      }

      // Filter out rooms that already have a scount creep assigned to them.
      if (assignedRooms.indexOf(testRoom) >= 0) {
        if (Game.creeps[Memory.intel.active[testRoom]]) {
          continue
        } else {
          delete Memory.intel.active[testRoom]
        }
      }
      if (Game.map.getRoomLinearDistance(creep.room.name, testRoom) > maxScoutDistance) {
        continue
      }
      if (!oldest || oldest > Memory.intel.targets[testRoom]) {
        oldest = Memory.intel.targets[testRoom]
        target = testRoom
      }
    }
  }

  if (Game.rooms[target]) {
    target = false
  }

  if (!target) {
    const adjacent = _.shuffle(_.values(Game.map.describeExits(creep.room.name)))
    target = adjacent[0]
    let oldest = 0
    let testRoom
    for (testRoom of adjacent) {
      if (!Game.map.isRoomAvailable(testRoom)) {
        continue
      }
      const roominfo = Room.getIntel(testRoom)
      let age
      if (!roominfo) {
        age = Infinity
      } else {
        age = assignedRooms.indexOf(testRoom) >= 0 ? 0 : Game.time - roominfo[INTEL_UPDATED]
        age = Math.floor(age / 10000) * 10000
      }
      if (target && oldest === age) {
        if (Math.random() >= 0.5) {
          target = testRoom
        }
      } else if (oldest < age) {
        oldest = age
        target = testRoom
      }
    }
  }

  creep.memory.starget = target
  Memory.intel.active[target] = creep.name
  return target
}
