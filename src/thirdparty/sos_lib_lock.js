'use strict';

function getLock(label, id=false, ttl=20) {
  if(!Memory.sos) {
    Memory.sos = {}
  }
  if(!Memory.sos.lock) {
    Memory.sos.lock = {}
  }
  if(!Memory.sos.lock[label] || parseInt(Memory.sos.lock[label].exp, 36) < Game.time) {
    if(!id) {
      id = sos.lib.uuid.vs()
    }
    Memory.sos.lock[label] = {
      id: id,
      exp: (ttl + Game.time).toString(36)
    }
  }
  if(Memory.sos.lock[label].id !== id) {
    return false
  }
  return Memory.sos.lock[label].id
}

function extendLock(label, id, ttl=20) {
  if(!Memory.sos) {
    return false
  }
  if(!Memory.sos.lock) {
    return false
  }
  if(!Memory.sos.lock[label]) {
    return false
  }
  if(Memory.sos.lock[label].id !== id) {
    return false
  }
  Memory.sos.lock[label].exp = (ttl + Game.time).toString(36)
  return Memory.sos.lock[label].id
}

function clearLock(label) {
  if(!Memory.sos) {
    return false
  }
  if(!Memory.sos.lock) {
    return false
  }
  if(!Memory.sos.lock[label]) {
    return false
  }
  delete Memory.sos.lock[label]
}

function cleanLocks() {
  if(!Memory.sos) {
    return false
  }
  if(!Memory.sos.lock) {
    return false
  }
  for(label in Memory.sos.lock) {
    if(parseInt(Memory.sos.lock[label].exp, 36) > Game.time) {
      delete Memory.sos.lock[label]
    }
  }
}

module.exports = {
  get: getLock,
  extend: extendLock,
  clear: clearLock,
  clean: cleanLocks,
}
