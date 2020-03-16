'use strict'

Room.getCostmatrix = function (roomname, opts = {}) {
  Logger.log(`Retrieving CostMatrix for ${roomname}`, LOG_TRACE)

  const cm = Room.getStructuresCostmatrix(roomname, opts)

  // Add in creeps
  if (Game.rooms[roomname]) {
    const room = Game.rooms[roomname]

    if (!opts.ignoreCreeps) {
      const creeps = room.find(FIND_CREEPS)
      for (const creep of creeps) {
        cm.set(creep.pos.x, creep.pos.y, 255)
      }
    }

    // Keep creeps from cluttering up core structure hallways.
    if (!opts.ignoreCore && room.storage && room.storage.my) {
      // Above terminal, near tower cluster entrance
      cm.set(room.storage.pos.x - 1, room.storage.pos.y - 1, 15)
      cm.set(room.storage.pos.x - 2, room.storage.pos.y - 1, 20)
      cm.set(room.storage.pos.x - 3, room.storage.pos.y - 1, 20)

      // Row below terminal and storage
      cm.set(room.storage.pos.x - 1, room.storage.pos.y + 1, 15)
      cm.set(room.storage.pos.x, room.storage.pos.y + 1, 15)
      cm.set(room.storage.pos.x + 1, room.storage.pos.y + 1, 7)

      // Column below terminal (first element covered above)
      cm.set(room.storage.pos.x - 1, room.storage.pos.y + 2, 15)
      cm.set(room.storage.pos.x - 1, room.storage.pos.y + 3, 7)
    }
  }

  // Allow avoid ranges to be set by range
  if (opts.avoidRange) {
    for (const avoid of opts.avoidRange) {
      const cost = avoid.value || 255
      setValuesInRange(cm, avoid.pos, avoid.range, cost)
    }
  }

  // Block all of these positions as unwalkable
  if (opts.avoid) {
    for (const pos of opts.avoid) {
      cm.set(pos.x, pos.y, 255)
    }
  }

  // Set these positions to just use terrain score
  if (opts.ignore) {
    for (const pos of opts.ignore) {
      cm.set(pos.x, pos.y, 0)
    }
  }

  return cm
}

const CACHE_IGNORE_DESTRUCTABLE = 1 << 0
const CACHE_IGNORE_ROADS = 1 << 1
const CACHE_IGNORE_SOURCE_KEEPER = 1 << 2
const CACHE_IGNORE_PORTALS = 1 << 3

Room.getStructuresCostmatrix = function (roomname, opts) {
  let flags = 0
  if (opts.ignoreDestructibleStructures) {
    flags = flags | CACHE_IGNORE_DESTRUCTABLE
  }
  if (opts.ignoreRoads) {
    flags = flags | CACHE_IGNORE_ROADS
  }
  if (opts.ignoreSourceKeepers) {
    flags = flags | CACHE_IGNORE_SOURCE_KEEPER
  }
  if (opts.ignorePortals) {
    flags = flags | CACHE_IGNORE_PORTALS
  }
  const cacheLabel = `${Room.serializeName(roomname)}_${(flags >>> 0)}`

  if (!opts.noCache) {
    const cmSerialized = sos.lib.cache.get(cacheLabel, {
      ttl: Game.rooms[roomname] ? 25 : false
    })
    if (cmSerialized) {
      return PathFinder.CostMatrix.deserialize(cmSerialized)
    }
  }
  const cm = new PathFinder.CostMatrix()

  // If this is a source keeper room include those resources
  if (!opts.ignoreSourceKeepers && Room.isSourcekeeper(roomname)) {
    const resourcePoses = Room.getResourcesPositions(roomname)
    if (resourcePoses) {
      for (const pos of resourcePoses) {
        setValuesInRange(cm, pos, 5, 15)
      }
    }
  }

  // Attempt to get structures from room.
  if ((!opts.ignoreDestructibleStructures || !opts.ignoreRoads || !opts.ignorePortals) && Game.rooms[roomname]) {
    const room = Game.rooms[roomname]
    const structures = room.find(FIND_STRUCTURES)
    for (const structure of structures) {
      if (structure.structureType === STRUCTURE_ROAD) {
        if (opts.ignoreRoads) {
          continue
        }
        cm.set(structure.pos.x, structure.pos.y, 1)
        continue
      }
      if (structure.structureType === STRUCTURE_PORTAL) {
        if (opts.ignorePortals) {
          continue
        }
        cm.set(structure.pos.x, structure.pos.y, 255)
      }
      if (opts.ignoreDestructibleStructures) {
        continue
      } else {
        if (!structure.my && structure.structureType === STRUCTURE_RAMPART) {
          cm.set(structure.pos.x, structure.pos.y, 255)
        } else if (OBSTACLE_OBJECT_TYPES.indexOf(structure.structureType) >= 0) {
          cm.set(structure.pos.x, structure.pos.y, 255)
        }
      }
    }
  }

  // Penalize exit squares to prevent accidental room changes
  if (!opts.ignoreExits) {
    const terrain = Game.map.getRoomTerrain(roomname)
    for (let n = 0; n <= 49; n++) {
      if (terrain.isWalkable(0, n)) {
        cm.set(0, n, 15)
      }
      if (terrain.isWalkable(49, n)) {
        cm.set(49, n, 15)
      }
      if (terrain.isWalkable(n, 0)) {
        cm.set(n, 0, 15)
      }
      if (terrain.isWalkable(n, 49)) {
        cm.set(n, 49, 15)
      }
    }
  }

  if (!opts.noCache) {
    sos.lib.cache.set(cacheLabel, cm.serialize(), {
      persist: true,
      maxttl: 3000,
      compress: true
    })
  }
  return cm
}

function setValuesInRange (cm, pos, range, value = 255) {
  const { left, right, top, bottom } = pos.getBoundingBoxForRange(range)

  for (let x = left; x <= right; x++) {
    for (let y = bottom; y <= top; y++) {
      cm.set(x, y, value)
    }
  }
}
