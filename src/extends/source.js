'use strict'

Source.prototype.getMiningPosition = function () {
  return this.pos.getMostOpenNeighbor(false, false)
}

Source.prototype.getLinkPosition = function () {
  return this.getMiningPosition().getMostOpenNeighbor(true)
}

Source.prototype.getLink = function (near = false) {
  if (!this.__link) {
    this.__link = this.pos.getLink(near)
  }
  return this.__link
}

Source.prototype.getActiveLink = function (near = false) {
  return this.pos.getActiveLink(near)
}
