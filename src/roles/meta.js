
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
      var source = creep.pos.findClosestByRange(sources)
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
