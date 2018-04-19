'use strict'

class Termcom {
  constructor() {
    if(!Memory.sos.communications) {
      Memory.sos.communications = {}
    }
    this.memory = Memory.sos.communications
    if(!this.memory.buffer) {
      this.memory.buffer = {}
    }
    if(!this.memory.queue) {
      this.memory.queue = {}
    }

  }

  publishTerminals(terminal_rooms, protocols=[]) {
    if(!terminal_rooms || terminal_rooms.length < 0) {
      sos.lib.broadcaster.resetChannel('termcom')
      return
    }
    sos.lib.broadcaster.updateChannel('termcom', {
      'terminals': terminal_rooms,
      'protocols': protocols
    })
  }

  buildmessages() {
    for(var transaction of Game.market.incomingTransactions) {
      if(!this.validateMessagePiece(transaction)) {
        continue
      }
      if(/^([\da-zA-Z]{1,3})\|([\d]{1,2})\|.+/.test(transaction.description)) {
        this.constructMessage(transaction)
      } else {
        var index_id = sos.lib.uuid.vs()
        this.memory.queue[index_id] = {
          id:index_id,
          user:transaction.sender.username,
          message:transaction.description,
          terminal:transaction.from,
          time: Game.time
        }
      }
    }
    this.memory.lastrun = Game.time
  }

  validateMessagePiece(transaction) {
    if(!!transaction.order) {
      return false
    }
    if(!transaction.description) {
      return false
    }
    if(!transaction.sender) {
      return false
    }
    if(!transaction.sender.username) {
      return false
    }
    if(transaction.sender.username == transaction.recipient.username) {
      return false
    }
    if(!!this.memory.lastrun) {
      if(transaction.time <= this.memory.lastrun) {
        return false
      }
    }
    if(!transaction.description) {
      return false
    }
    if(transaction.description.length <= 0) {
      return false
    }
    return true
  }

  constructMessage(transaction) {

    var user = transaction['sender']['username']
    var description = transaction['description']

    if(!this.memory.buffer[user]) {
      this.memory.buffer[user] = {}
    }

    // msg_id|packet_id|[max_packages]|message
    // 431|0|3|message
    // 431|2|message

    var pieces = transaction.description.split('|')

    // get id from message
    var id = pieces[0]

    var index_id = user + '_' + id

    if(!this.memory.buffer[index_id]) {
      this.memory.buffer[index_id] = {
        parts: {},
        total: false,
        time: transaction['time'],
      }
    }

    // get package_id
    var packet_id = pieces[1]

    // get total packets
    if(packet_id == 0) {
      this.memory.buffer[index_id].total = pieces[2]-1
      this.memory.buffer[index_id].terminal = transaction.from
      var message_piece = pieces[3]
    } else {
      var message_piece = pieces[2]
    }

    // get message piece
    this.memory.buffer[index_id].parts[packet_id] = message_piece
    if(!!this.memory.buffer[index_id].total) {
      var total = this.memory.buffer[index_id].total
      if(Object.keys(this.memory.buffer[index_id].parts).length == total) {
        var message = ''
        for(var i = 0; i < total; i++) {
          message += this.memory.buffer[index_id].parts[i]
        }
        this.memory.queue[index_id] = {
          id: index_id,
          user:user,
          message:message,
          terminal:this.memory.buffer[index_id].terminal,
          time: Game.time
        }
        delete this.memory.buffer[index_id]
      }
    }
  }

  cleanBuffer() {
    var messages = Object.keys(this.memory.buffer)
    for(var index_id of messages) {
      if(Game.time - this.memory.buffer[index_id].time > 1000) {
        delete this.memory.buffer[index_id]
      }
    }
  }

  cleanQueue() {
    var messages = Object.keys(this.memory.queue)
    for(var index_id of messages) {
      if(Game.time - this.memory.queue[index_id].time > 5000) {
        delete this.memory.queue[index_id]
      }
    }
  }

  removeMessage(id) {
    if(!!this.memory.queue[id]) {
      delete this.memory.queue[id]
    }
  }

  getMessageByID(id) {
    if(!!this.memory.queue[id]) {
      return this.memory.queue[id]
    }
  }

  getMessages() {
    return this.memory.queue
  }

  sendMessage(message, room) {
    if(!this.memory.squeue) {
      this.memory.squeue = []
    }

    // Message is small enough to fit in a single transmission
    if(message.length <= 100) {
      this.memory.squeue.push({
        to: room,
        packet: message
      })
      return
    }

    var msg_id = sos.lib.uuid.v4().substring(24, 26)

    // header size == 8
    // available message chars == 92
    var total_pieces = Math.ceil(message.length/92)
    for(var i = 0; i < total_pieces; i++) {
      var packet = msg_id
      packet += '|' + i
      if(i == 0) {
        packet += '|' + total_pieces
      }
      packet += message.slice(i, i+92)
      this.memory.squeue.push({
        to: room,
        packet: packet
      })
    }
  }

  hasPacketsToSend() {
    return !!this.memory.squeue && this.memory.squeue.length > 0
  }

  getNextPacketToSend() {
    if(this.memory.squeue.length < 1) {
      return false
    }
    return this.memory.squeue.shift()
  }

}

module.exports = new Termcom()
