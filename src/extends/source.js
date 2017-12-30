'use strict'

Source.prototype.getMiningPosition = function () {
  return this.pos.getMostOpenNeighbor(false, false)
}

Source.prototype.getLinkPosition = function () {
  return this.getMiningPosition().getMostOpenNeighbor(true)
}

Source.prototype.getLink = function () {
  if (!this.__link) {
    this.__link = this.pos.getLink()
  }
  return this.__link
}
