
module.exports.findRoute = function (fromRoom, toRoom, opts = {}) {
  if (!opts.routeCallback) {
    opts.routeCallback = function (toRoom, fromRoom) {
      return module.exports.getRoomScore(toRoom)
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

module.exports.getRoomScore = function (roomName) {
  if (!Game.map.isRoomAvailable(roomName)) {
    return Infinity
  }
  if (Room.isSourcekeeper(roomName)) {
    return PATH_WEIGHT_SOURCEKEEPER
  }
  if (Room.isHallway(roomName)) {
    return PATH_WEIGHT_HALLWAY
  }
  const roomIntel = Room.getIntel(roomName)
  if (roomIntel && roomIntel[INTEL_OWNER]) {
    if (roomIntel[INTEL_OWNER] === USERNAME) {
      return PATH_WEIGHT_OWN
    }
    return roomIntel[INTEL_LEVEL] ? PATH_WEIGHT_HOSTILE : PATH_WEIGHT_HOSTILE_RESERVATION
  }
  return PATH_WEIGHT_NEUTRAL
}
