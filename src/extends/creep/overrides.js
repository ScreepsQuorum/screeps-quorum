
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
