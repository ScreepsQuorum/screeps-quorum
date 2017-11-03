
StructureController.prototype.isTimingOut = function () {
  if (!this.level || !CONTROLLER_DOWNGRADE[this.level]) {
    return false
  }
  return CONTROLLER_DOWNGRADE[this.level] - this.ticksToDowngrade > 4000
}

StructureController.prototype.canSafemode = function () {
  if (!this.level) {
    return false
  }
  if (!this.my) {
    return false
  }
  if (!this.safeModeAvailable) {
    return false
  }
  if (this.safeModeCooldown) {
    return false
  }
  if (this.upgradeBlocked) {
    return false
  }
  if (this.ticksToDowngrade && CONTROLLER_DOWNGRADE[this.level] - this.ticksToDowngrade >= 5000) {
    return false
  }
  return true
}
