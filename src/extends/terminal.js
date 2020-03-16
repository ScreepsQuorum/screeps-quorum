'use strict'

StructureTerminal.prototype.canReceive = function (resource = false) {
  const buffer = this.getBuffer()
  if (buffer < 50000) {
    if (buffer > 5000) {
      // Transfer energy to help terminal drain itself of excess resources.
      if (resource === RESOURCE_ENERGY && this.store[RESOURCE_ENERGY] < 5000) {
        return true
      }
    }
    return false
  }
  return true
}

StructureTerminal.prototype.getBuffer = function () {
  return this.storeCapacity - _.sum(this.store)
}

if (!StructureTerminal.prototype.__send) {
  StructureTerminal.prototype.__send = StructureTerminal.prototype.send
  StructureTerminal.prototype.send = function (resourceType, amount, destination, description) {
    const ret = this.__send(resourceType, amount, destination, description)
    if (ret === OK) {
      let log = `Terminal in ${this.room.name} sent ${amount} ${resourceType} to ${destination}`
      if (description) {
        log += `: ${description}`
      }
      Logger.log(log, LOG_INFO)
    } else {
      const log = `Terminal in ${this.room.name} failed to send ${amount} ${resourceType} to ${destination} due to error ${ret}`
      Logger.log(log, LOG_ERROR)
    }
    return ret
  }
}
