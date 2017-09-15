
class MetaRole {

  recharge(creep) {
    if (creep.carry[RESOURCE_ENERGY] <= 0) {
      creep.memory.recharge = true
    }
    if (creep.carry[RESOURCE_ENERGY] >= creep.carryCapacity) {
      creep.memory.recharge = false
    }
    if (creep.memory.recharge) {
      var sources = creep.room.find(FIND_SOURCES_ACTIVE)
      sources.sort((a, b) => a.pos.getRangeTo(a.room.controller) - b.pos.getRangeTo(b.room.controller))
      let idx = parseInt(creep.name[creep.name.length - 1], 36)
      var source = sources[idx % sources.length]
      if (!creep.pos.isNearTo(source)) {
        creep.moveTo(source)
      }
      if (creep.pos.isNearTo(source)) {
        creep.harvest(source)
      }
      return true
    }
    return false
  }

}

module.exports = MetaRole
