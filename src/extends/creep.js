'use strict'

Creep.getRole = function (roleName) {
  var role = require('roles_' + roleName)
  return new role()
}

Creep.prototype.getRole = function () {
  // If the creep role isn't in memory grab it based off of the name
  if (!this.memory.role) {
    var role_type = this.name.split('_')[0]
  } else {
    var role_type = this.memory.role
  }
  return Creep.getRole(role_type)
}

Creep.getCost = function (parts) {
  if (typeof parts == 'string') {
    if (BODYPART_COST[parts]) {
      return BODYPART_COST[parts]
    }
  }
  var cost = 0
  _.forEach(parts, function (part) {
    cost += BODYPART_COST[part]
  })
  return cost
}

Creep.buildFromTemplate = function (template, energy) {
  var parts = []
  while(energy > 0 && parts.length < 50) {
    var next = template[parts.length % template.length]
    if(BODYPART_COST[next] > energy) {
      break
    }
    energy -= BODYPART_COST[next]
    parts.push(next)
  }
  return parts
}
