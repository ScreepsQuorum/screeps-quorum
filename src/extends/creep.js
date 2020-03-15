'use strict'

Creep.getRole = function (roleName) {
  const Role = require('roles_' + roleName)
  return new Role()
}

Creep.getRoleFromName = function (creepname) {
  return Creep.getRole(creepname.split('_', 1)[0])
}

Creep.prototype.getRole = function () {
  // If the creep role isn't in memory grab it based off of the name
  const roleType = this.memory.role ? this.memory.role : this.name.split('_', 1)[0]
  return Creep.getRole(roleType)
}

Creep.getCost = function (parts) {
  if (typeof parts === 'string') {
    if (BODYPART_COST[parts]) {
      return BODYPART_COST[parts]
    }
  }
  let cost = 0
  _.forEach(parts, function (part) {
    cost += BODYPART_COST[part]
  })
  return cost
}

Creep.buildFromTemplate = function (template, energy) {
  const parts = []
  while (energy > 0 && parts.length < 50) {
    const next = template[parts.length % template.length]
    if (BODYPART_COST[next] > energy) {
      break
    }
    energy -= BODYPART_COST[next]
    parts.push(next)
  }
  return parts
}

Creep.prototype.getCarryPercentage = function () {
  if (this.carryCapacity <= 0) {
    return 0
  }
  return _.sum(this.carry) / this.carryCapacity
}
