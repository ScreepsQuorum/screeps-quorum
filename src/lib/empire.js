'use strict'

class Empire {
  get dossier () {
    if (!this._dossier) {
      this._dossier = new qlib.Dossier()
    }
    return this._dossier
  }

  get terminals () {
    if (!this._terminals) {
      this._terminals = []
      for (const city of this.cities) {
        if (Game.rooms[city] && Game.rooms[city].terminal && Game.rooms[city].terminal.my) {
          this._terminals.push(Game.rooms[city].terminal)
        }
      }
    }
    return this._terminals
  }

  get cities () {
    if (!this._cities) {
      this._cities = Room.getCities()
    }
    return this._cities
  }
}

module.exports = Empire
