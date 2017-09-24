'use strict'

Source.prototype.getMiningPosition = function () {
  return this.pos.getMostOpenNeighbor()
}

Source.prototype.getLinkPosition = function () {
  return this.getMiningPosition().getMostOpenNeighbor()
}
