'use strict';

function counterGet(group) {

  if(!Memory.sos) {
    Memory.sos = {}
  }
  if(!Memory.sos.counter) {
    Memory.sos.counter = {}
  }

  if (!Memory.sos.counter[group]) {
    Memory.sos.counter[group] = 1
  } else {
    Memory.sos.counter[group]++
  }

  return Memory.sos.counter[group]
}

function counterSet(group, value) {
  if(!Memory.sos) {
    Memory.sos = {}
  }
  if(!Memory.sos.counter) {
    Memory.sos.counter = {}
  }
  Memory.sos.counter[group] = value
  return value
}

function counterReset(group) {
  if(!Memory.sos) {
    Memory.sos = {}
  }
  if(!Memory.sos.counter) {
    Memory.sos.counter = {}
  }
  if(Memory.sos.counter[group]) {
    delete Memory.sos.counter[group]
  }
}

module.exports = {
  get: counterGet,
  set: counterSet,
  reset: counterReset
}
