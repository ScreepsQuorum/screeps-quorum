'use strict'

Source.prototype.getMiningPosition = function() {
  return this.pos.getMostOpenNeighbor()
}
