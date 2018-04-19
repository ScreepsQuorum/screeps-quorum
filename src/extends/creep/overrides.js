'use strict'

// Send notification when room is claimed
if (!Creep.prototype.__claimOriginal) {
  Creep.prototype.__claimControllerOriginal = Creep.prototype.claimController
  Creep.prototype.claimController = function (controller) {
    const ret = this.__claimControllerOriginal(controller)
    if (ret === OK) {
      qlib.notify.send(`Claiming ${controller.room.name}`)
    }
    return ret
  }
}

// Update time when construction sites are built
if (!Creep.prototype.__buildOriginal) {
  Creep.prototype.__buildOriginal = Creep.prototype.build
  Creep.prototype.build = function (target) {
    const ret = this.__buildOriginal(target)
    if (ret === OK) {
      if (!Memory.construction) {
        Memory.construction = {}
      }
      Memory.construction[target.id] = Game.time
    }
    return ret
  }
}
