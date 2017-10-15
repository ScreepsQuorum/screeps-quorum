
class Events {
  constructor () {
    if (!Memory.events) {
      Memory.events = {}
    }
    this.memory = Memory.events
  }

  getEventTime (event) {
    if (!this.memory[event]) {
      return 0
    }
    return this.memory[event]
  }

  recordEvent (event) {
    this.memory[event] = Game.time
  }

  getTimeSinceEvent (event) {
    return Game.time - this.getEventTime()
  }
}

module.exports = new Events()
