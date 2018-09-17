'use strict'

Source.prototype.getMiningPosition = function () {
  return this.pos.getMostOpenNeighbor(false, false)
}

Source.prototype.getLinkPosition = function () {
  return this.getMiningPosition().getMostOpenNeighbor(true)
}

Source.prototype.getLink = function () {
  if (!this.__link) {
    this.__link = this.getMiningPosition().getLink(1)
  }
  return this.__link
}

Source.prototype.getActiveLink = function () {
  return this.pos.getActiveLink()
}
