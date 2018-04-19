'use strict'

if(!global.NODEID) {
  global.NODEID = sos.lib.uuid.vs()
}

class StormTracker {
  track() {
    if(!Memory.sos) {
      return
    }

    if(!Memory.sos.st) {
      Memory.sos.st = {}
    }

    this.memory = Memory.sos.st
    if(!this.memory.nodes) {
      this.memory.nodes = {}
    }

    if(!this.memory.nodes[NODEID] || typeof this.memory.nodes[NODEID] != 'object') {
      this.memory.nodes[NODEID] = {
        fs: Game.time,
        t: 0
      }
    }
    this.memory.nodes[NODEID].ls = Game.time
    this.memory.nodes[NODEID].t++


    this.clean()

    // Calculate minumum

    this.nodes = Object.keys(this.memory.nodes)
    this.calculateMinimum()
  }

  clean() {
    for(var nodeid of Object.keys(this.memory.nodes)) {
      if(Game.time - this.memory.nodes[nodeid].ls > 120) {
        delete this.memory.nodes[nodeid]
      }
    }
  }

  calculateMinimum() {

    // No memory - set artificially high so it will be adjusted.
    if(!this.memory.min) {
      this.memory.min = {c: 16, t:Game.time}
    }

    // Recently changed - ignore.
    if(Game.time - this.memory.min.t < 15) {
      return
    }

    // Minimum hasn't been reached in awhile, increase it to find the new value.
    if(Game.time - this.memory.min.t > 3000) {
      this.memory.min.c++
    }

    // If current number of nodes is less than or equal to the minimun reset
    // the value.
    if(this.memory.min.c >= this.nodes.length) {
      this.memory.min = {c: this.nodes.length, t:Game.time}
      return
    }

  }

  getNormalNodeCount() {
    // assume 1
    if(!Memory.sos || !Memory.sos.st || !Memory.sos.st.min) {
      return 1
    }
    return Memory.sos.st.min
  }

  isStorming() {
    if(this.nodes.length > this.memory.min.c * 2.5) {
      for(var nodeid of Object.keys(this.memory.nodes)) {
        if(Game.time - this.memory.nodes[nodeid].fs <= 8) {
          return true
        }
      }
    }
    return false
  }

  getNodeData(nodeid=false) {
    if(!nodeid) {
      nodeid = NODEID
    }
    if(!this.memory.nodes[nodeid]) {
      return false
    }
    return {
      lastseen: this.memory.nodes[nodeid].ls,
      firstseen: this.memory.nodes[nodeid].fs,
      ticksrun: this.memory.nodes[nodeid].t,
    }
  }
}


module.exports = new StormTracker()
