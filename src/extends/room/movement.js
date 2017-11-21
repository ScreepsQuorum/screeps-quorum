'use strict'

Room.getCostmatrix = function (roomname, opts = {}) {
  Logger.log(`Retrieving CostMatrix for ${roomname}`, LOG_TRACE)

  const cm = Room.getStructuresCostmatrix(roomname, opts)

  // Add in creeps
  if (!opts.ignoreCreeps && Game.rooms[roomname]) {
    const room = Game.rooms[roomname]
    const creeps = room.find(FIND_CREEPS)
    for (let creep of creeps) {
      cm.set(creep.pos.x, creep.pos.y, 255)
    }
  }

  // Allow avoid ranges to be set by range
  if (opts.avoidRange) {
    for (let avoid of opts.avoidRange) {
      const cost = avoid.value || 255
      setValuesInRange(cm, avoid.pos, avoid.range, cost)
    }
  }

  // Block all of these positions as unwalkable
  if (opts.avoid) {
    for (let pos of opts.avoid) {
      cm.set(pos.x, pos.y, 255)
    }
  }

  // Set these positions to just use terrain score
  if (opts.ignore) {
    for (let pos of opts.ignore) {
      cm.set(pos.x, pos.y, 0)
    }
  }

  return cm
}

const CACHE_IGNORE_DESTRUCTABLE = 1 // 0001
const CACHE_IGNORE_ROADS = 2 // 0010
const CACHE_IGNORE_SOURCE_KEEPER = 4 // 0100

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
  const cacheLabel = `${Room.serializeName(roomname)}_${(flags >>> 0)}`

  let cmSerialized = sos.lib.cache.get(cacheLabel, {
    ttl: Game.rooms[roomname] ? 25 : false
  })
  if (cmSerialized) {
    return PathFinder.CostMatrix.deserialize(cmSerialized)
  }
  const cm = new PathFinder.CostMatrix()

  // If this is a source keeper room include those resources
  if (!opts.ignoreSourceKeepers && Room.isSourcekeeper(roomname)) {
    const resourcePoses = Room.getResourcesPositions(roomname)
    if (resourcePoses) {
      for (let pos of resourcePoses) {
        setValuesInRange(cm, pos, 5, 15)
      }
    }
  }

  // Attempt to get structures from room.
  if ((!opts.ignoreDestructibleStructures || !opts.ignoreRoads) && Game.rooms[roomname]) {
    const room = Game.rooms[roomname]
    const structures = room.find(FIND_STRUCTURES)
    for (let structure of structures) {
      if (structure.structureType === STRUCTURE_ROAD) {
        cm.set(structure.pos.x, structure.pos.y, 1)
        continue
      }
      if (opts.ignoreDestructibleStructures) {
        continue
      }
      if (!structure.my && structure.structureType === STRUCTURE_RAMPART) {
        cm.set(structure.pos.x, structure.pos.y, 255)
      } else if (OBSTACLE_OBJECT_TYPES.indexOf(structure.structureType) >= 0) {
        cm.set(structure.pos.x, structure.pos.y, 255)
      }
    }
  }

  // Penalize exit squares to prevent accidental room changes
  if (!opts.ignoreExits) {
    for (let n = 0; n <= 49; n++) {
      if (Game.map.getTerrainAt(0, n) === 'plain') {
        cm.set(0, n, 15)
      }
      if (Game.map.getTerrainAt(49, n) === 'plain') {
        cm.set(49, n, 15)
      }
      if (Game.map.getTerrainAt(n, 0) === 'plain') {
        cm.set(n, 0, 15)
      }
      if (Game.map.getTerrainAt(n, 49) === 'plain') {
        cm.set(n, 49, 15)
      }
    }
  }

  sos.lib.cache.set(cacheLabel, cm.serialize(), {
    persist: true,
    maxttl: 3000,
    compress: true
  })
  return cm
}

function setValuesInRange (cm, pos, range, value) {
  const left = pos.x - value
  const right = pos.x + value
  const top = pos.y - value
  const bottom = pos.y + value
  for (let x = left > 0 ? left : 0; x <= (right < 40 ? right : 49); x++) {
    for (let y = bottom > 0 ? bottom : 0; y <= (top < 40 ? top : 49); y++) {
      cm.set(x, y, 255)
    }
  }
}
