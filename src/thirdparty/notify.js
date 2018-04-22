'use strict'
const MAX_QUEUE_SIZE = 30

var Notify = function (message, limit=false, groups=false) {

  // Remove messages from older versions
  if(Memory.__notify) {
    delete Memory.__notify
  }

  if(!groups) {
    groups = ['default']
  }

  // If no limit then send immediately (and potentially repeatedly)
  if(!limit) {
    Notify.queueMessage(message)
    return
  }

  // Save message history, normalizing digits to prevent notification spam.
  const history_message = (message + '::' + groups.join('_')).replace(/\s(\d+)/g, 'X')

  if(!Memory.__notify_history) {
    Memory.__notify_history = {}
  }

  // If the message was sent in the last LIMIT ticks then don't send again.
  if(!!Memory.__notify_history[history_message]) {
    var lastSent = Memory.__notify_history[history_message]
    if(lastSent >= Game.time - limit) {
      return
    } else {
      // History is older than limit so delete it.
      delete Memory.__notify_history[history_message]
    }
  }

  // Record message in history and send it.
  if (Notify.queueMessage(message, groups)) {
    Memory.__notify_history[history_message] = Game.time
  }
  return 0
}

let reset = Game.time
let num = 0
let shardid = ''
if(Game.shard && Game.shard.name) {
  const matches = Game.shard.name.match(/\d+$/);
  if (matches) {
    shardid = parseInt(matches[0]).toString(36);
  }
}

Notify.getUUID = function () {
  if (reset !== Game.time) {
    reset = Game.time
    num = 0
  }
  num++
  return shardid + Game.time.toString(36) + num.toString(36)
}


Notify.queueMessage = function (message, groups) {
  if(!Memory.__notify_v2) {
    Memory.__notify_v2 = {}
  }
  if (Memory.__notify_v2.length >= MAX_QUEUE_SIZE) {
    return false
  }
  const id = Notify.getUUID()
  Memory.__notify_v2[id] = {
    'message': message,
    'groups': groups,
    'tick': Game.time
  }
}

// Clean up history instead of leaving old messages around
Notify.cleanHistory = function (limit) {
  if(!limit) {
    limit = 20000
  }

  // Clear any already sent messages
  if(Memory.__notify_v2) {
    var ids = Object.keys(Memory.__notify_v2)
    for(var id of ids) {
      if(typeof Memory.__notify_v2[id] !== 'Object') {
        delete Memory.__notify_v2[id]
      }
    }
  }

  // Clear expired historical messages.
  if(Memory.__notify_history) {
    var messages = Object.keys(Memory.__notify_history)
    for(var i in messages) {
      var message = messages[i]
      if(Memory.__notify_history[message] < Game.time - limit) {
        delete Memory.__notify_history[message]
      }
    }
  }
}

module.exports = Notify
