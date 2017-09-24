
StructureController.prototype.isTimingOut = function () {
  if (!this.level || !CONTROLLER_DOWNGRADE[this.level]) {
    return false
  }
  return CONTROLLER_DOWNGRADE[this.level] - this.ticksToDowngrade > 4000
}
