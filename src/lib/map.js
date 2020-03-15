'use strict'

module.exports.findRoute = function (fromRoom, toRoom, opts = {}) {
  if (!opts.routeCallback) {
    opts.routeCallback = function (toRoom, fromRoom) {
      const score = module.exports.getRoomScore(toRoom, fromRoom, opts)
      if (opts.avoidHostileRooms && score > PATH_WEIGHT_NEUTRAL) {
        return Infinity
      }
      return score
    }

    // If destination is not reachable do not attempt to route to it.
    const toRoomScore = opts.routeCallback(toRoom)
    if (toRoomScore === Infinity) {
      return ERR_NO_PATH
    }

    if (!opts.ignoreCache) {
      const cacheLabel = `route_${Room.serializeName(fromRoom)}_${Room.serializeName(toRoom)}`
      const cachedPath = sos.lib.cache.get(cacheLabel)
      if (cachedPath) {
        return cachedPath
      }
      const newPath = Game.map.findRoute(fromRoom, toRoom, opts)
      const options = { maxttl: 150 }
      if (newPath.length >= 4) {
        options.persist = true
      }
      sos.lib.cache.set(cacheLabel, newPath, options)
      return newPath
    }
  }
  return Game.map.findRoute(fromRoom, toRoom, opts)
}

module.exports.getDistanceToEmpire = function (roomname, algorithm = 'linear') {
  const cachedDistance = sos.lib.cache.get(`empire_distance_${algorithm}_${roomname}`)
  if (cachedDistance) {
    return cachedDistance
  }
  let minimum = Infinity
  const df = algorithm === 'linear' ? Game.map.getRoomLinearDistance : module.exports.getRoomManhattanDistance
  const cities = Room.getCities()
  for (const city of cities) {
    const distance = df(city, roomname)
    if (minimum > distance) {
      minimum = distance
    }
  }
  sos.lib.cache.set(`empire_distance_${algorithm}_${roomname}`, minimum, { maxttl: 50 })
  return minimum
}

module.exports.getRoomManhattanDistance = function (start, finish) {
  const startCoords = Room.getCoordinates(start)
  const finishCoords = Room.getCoordinates(finish)

  let x = 0
  if (startCoords.x_dir === finishCoords.x_dir) {
    x = Math.abs(startCoords.x - finishCoords.x)
  } else {
    x = startCoords.x + finishCoords.x + 1
  }

  let y = 0
  if (startCoords.y_dir === finishCoords.y_dir) {
    y = Math.abs(startCoords.y - finishCoords.y)
  } else {
    y = startCoords.y + finishCoords.y + 1
  }

  return y + x
}

module.exports.reachableFromEmpire = function (roomname, algorithm = 'linear', distance = false) {
  if (!distance) {
    distance = (Math.ceil(CREEP_LIFE_TIME / 50) + 1)
  }
  return module.exports.getDistanceToEmpire(roomname, algorithm) <= distance
}

// Define default scores (can be overridden)
const PATH_WEIGHT_HALLWAY = 1
const PATH_WEIGHT_SOURCEKEEPER = 1
const PATH_WEIGHT_OWN = 1
const PATH_WEIGHT_NEUTRAL = 2
const PATH_WEIGHT_HOSTILE = 10
const PATH_WEIGHT_HOSTILE_RESERVATION = 5

module.exports.getRoomScore = function (toRoom, fromRoom, opts = {}) {
  if (!Game.map.isRoomAvailable(toRoom)) {
    return Infinity
  }
  if (!module.exports.reachableFromEmpire(toRoom)) {
    return Infinity
  }
  const scores = opts.scores ? opts.scores : {}
  if (Room.isSourcekeeper(toRoom)) {
    return scores.WEIGHT_SOURCEKEEPER ? scores.WEIGHT_SOURCEKEEPER : PATH_WEIGHT_SOURCEKEEPER
  }
  if (Room.isHallway(toRoom)) {
    return scores.WEIGHT_HALLWAY ? scores.WEIGHT_HALLWAY : PATH_WEIGHT_HALLWAY
  }

  if (fromRoom) {
    const fromRoomIntel = Room.getIntel(fromRoom)
    if (fromRoomIntel[INTEL_BLOCKED_EXITS] && fromRoomIntel[INTEL_BLOCKED_EXITS].indexOf(toRoom) >= 0) {
      return Infinity
    }
  }

  const roomIntel = Room.getIntel(toRoom)
  if (roomIntel && roomIntel[INTEL_OWNER]) {
    if (roomIntel[INTEL_OWNER] === USERNAME) {
      return scores.WEIGHT_OWN ? opts.scores.WEIGHT_OWN : PATH_WEIGHT_OWN
    }
    if (roomIntel[INTEL_LEVEL]) {
      return scores.WEIGHT_HOSTILE ? scores.WEIGHT_HOSTILE : PATH_WEIGHT_HOSTILE
    } else {
      return scores.WEIGHT_HOSTILE_RESERVATION ? scores.WEIGHT_HOSTILE_RESERVATION : PATH_WEIGHT_HOSTILE_RESERVATION
    }
  }
  return scores.WEIGHT_NEUTRAL ? scores.WEIGHT_NEUTRAL : PATH_WEIGHT_NEUTRAL
}
