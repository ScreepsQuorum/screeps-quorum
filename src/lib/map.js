
module.exports.findRoute = function (fromRoom, toRoom, opts = {}) {
  if (!opts.routeCallback) {
    opts.routeCallback = function (toRoom, fromRoom) {
      return module.exports.getRoomScore(toRoom, fromRoom)
    }
    if (!opts.ignoreCache) {
      const cacheLabel = `route_${Room.serializeName(fromRoom)}_${Room.serializeName(toRoom)}`
      const cachedPath = sos.lib.cache.get(cacheLabel)
      if (cachedPath) {
        return cachedPath
      }
      const newPath = Game.map.findRoute(fromRoom, toRoom, opts)
      let options = {maxttl: 150}
      if (newPath.length >= 4) {
        options.persist = true
      }
      sos.lib.cache.set(cacheLabel, newPath, options)
      return newPath
    }
  }
  return Game.map.findRoute(fromRoom, toRoom, opts)
}

const PATH_WEIGHT_HALLWAY = 1
const PATH_WEIGHT_SOURCEKEEPER = 1
const PATH_WEIGHT_OWN = 1
const PATH_WEIGHT_NEUTRAL = 3
const PATH_WEIGHT_HOSTILE = 10
const PATH_WEIGHT_HOSTILE_RESERVATION = 5

module.exports.getRoomScore = function (toRoom, fromRoom) {
  if (!Game.map.isRoomAvailable(toRoom)) {
    return Infinity
  }
  if (Room.isSourcekeeper(toRoom)) {
    return PATH_WEIGHT_SOURCEKEEPER
  }
  if (Room.isHallway(toRoom)) {
    return PATH_WEIGHT_HALLWAY
  }

  const fromRoomIntel = Room.getIntel(fromRoom)
  if (fromRoomIntel[INTEL_BLOCKED_EXITS] && fromRoomIntel[INTEL_BLOCKED_EXITS].indexOf(toRoom) >= 0) {
    return Infinity
  }

  const roomIntel = Room.getIntel(toRoom)
  if (roomIntel && roomIntel[INTEL_OWNER]) {
    if (roomIntel[INTEL_OWNER] === USERNAME) {
      return PATH_WEIGHT_OWN
    }
    return roomIntel[INTEL_LEVEL] ? PATH_WEIGHT_HOSTILE : PATH_WEIGHT_HOSTILE_RESERVATION
  }
  return PATH_WEIGHT_NEUTRAL
}
