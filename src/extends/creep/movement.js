'use strict'

const defaultHighestMaxOps = 5000
const defaultMaxOpsPerRoom = 1500
const struckThreshold = 2
const struckRerouteThreshold = 4
const travelToDefaults = {
  'reusePath': 1500,
  'moveToOverride': true,
  'ignoreStuck': false,
  'ignoreHostileCities': true,
  'ignoreHostileReservations': true
}

Creep.prototype.travelTo = function (pos, opts = {}) {
  const that = this
  if (this.fatigue) {
    return ERR_TIRED
  }

  // Allow objects with a pos value to be passed in as destinations.
  if (pos.pos) {
    pos = pos.pos
  }

  const moveToOpts = Object.assign({}, travelToDefaults, opts)

  if (typeof moveToOpts.maxRooms === 'undefined') {
    // If the destination is in the same room as the creep restrict pathfinding to that room.
    if (this.room.name === pos.roomName) {
      moveToOpts.maxRooms = 1
    } else {
      moveToOpts.maxRooms = 16
    }
  }

  // Compute max operations based on number of rooms.
  if (typeof moveToOpts.maxOps === 'undefined') {
    moveToOpts.maxOps = Math.min(defaultMaxOpsPerRoom * moveToOpts.maxRooms, defaultHighestMaxOps)
  }

  // If stuck detection isn't disabled attempt to detect and remediate creeps that are stuck.
  if (moveToOpts.ignoreStuck !== true) {
    // Detect whether creep is stuck or not
    if (this.memory._lp) {
      if (this.memory._lp === this.pos.serialize()) {
        if (!this.memory._sc) {
          this.memory._sc = 0
        }
        this.memory._sc++
      } else {
        delete this.memory._lp
        this.memory._sc = 0
      }
    }
    // Apply special options when stuck
    if (this.memory._sc >= struckThreshold) {
      delete this.memory._move
      if (typeof moveToOpts.ignoreCreeps === 'undefined') {
        moveToOpts.ignoreCreeps = false
      }
      // This creep is really stuck attempt to have it move to a random empty space.
      if (this.memory._sc > struckRerouteThreshold) {
        const steppable = this.pos.getSteppableAdjacent(true)
        if (steppable.length > 0) {
          return this.move(this.pos.getDirectionTo(_.shuffle(steppable)[0]))
        }
      }
    }

    // Default to having ignoreCreeps set to true if it isn't already set.
    if (typeof moveToOpts.ignoreCreeps === 'undefined') {
      moveToOpts.ignoreCreeps = true
    }

    // If destination pos is nearby go to it immediately and skip `moveTo` call.
    if (this.pos.roomName === pos.roomName) {
      if (this.pos.isNearTo(pos)) {
        return this.move(this.pos.getDirectionTo(pos))
      }
    }

    // Save current location to compare to next move attempt.
    this.memory._lp = this.pos.serialize()
  }

  if (!moveToOpts.direct && this.room.name !== pos.roomName) {
    if (!moveToOpts.allowedRooms) {
      moveToOpts.allowedRooms = []
    }
    const worldRoute = qlib.map.findRoute(this.room.name, pos.roomName)
    if (Number.isInteger(worldRoute)) {
      return worldRoute
    }
    for (let pathPiece of worldRoute) {
      if (moveToOpts.allowedRooms.indexOf(pathPiece['room']) < 0) {
        moveToOpts.allowedRooms.push(pathPiece['room'])
      }
    }
  }

  // Make sure the current room is always allowed
  if (moveToOpts.allowedRooms && moveToOpts.allowedRooms.indexOf(this.room.name) < 0) {
    moveToOpts.allowedRooms.push(this.room.name)
  }

  // If no cost matrix callback is defined use the default room one.
  if (!moveToOpts.costCallback) {
    moveToOpts.costCallback = function (roomname) {
      if (moveToOpts.allowedRooms && moveToOpts.allowedRooms.indexOf(roomname) < 0) {
        return false
      }
      // See if hostile cities or reservations are blocked
      if (!opts.ignoreHostileCities || !opts.ignoreHostileReservations) {
        // Make sure not to deny costmatrix data for the room the creep is in or going to.
        if (pos.roomName !== roomname && that.pos.roomName !== roomname) {
          const roominfo = Room.getIntel(roomname)
          // Don't block rooms owner by the player
          if (roominfo[INTEL_OWNER] && roominfo[INTEL_OWNER] !== USERNAME) {
            if (roominfo[INTEL_LEVEL] && !opts.ignoreHostileCities) {
              return false
            } else if (!roominfo[INTEL_LEVEL] && !opts.ignoreHostileReservations) {
              return false
            }
          }
        }
      }
      return Room.getCostmatrix(roomname, opts)
    }
  }

  // Run built in moveTo function for now. Once enough features (costmatrixes, internal pathcaching, global pathcaching)
  // have been developed this can be swapped out for moveByPath.
  return this.moveTo(pos, moveToOpts)
}

Creep.prototype.isStuck = function () {
  return this.memory._sc && this.memory._sc >= struckThreshold
}

if (!Creep.prototype.__moveToOriginal) {
  Creep.prototype.__moveToOriginal = Creep.prototype.moveTo
  Creep.prototype.moveTo = function (pos, opts = {}) {
    if (!opts.moveToOverride) {
      Logger.log('Deprecated: call `travelTo` instead of `moveTo`', LOG_ERROR)
    }
    return this.__moveToOriginal(pos, opts)
  }
}
