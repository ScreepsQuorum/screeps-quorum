
class Empire {
  get dossier () {
    if (!this._dossier) {
      this._dossier = new qlib.Dossier()
    }
    return this._dossier
  }
}

module.exports = Empire
