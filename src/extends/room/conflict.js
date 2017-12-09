'use strict'

Room.prototype.getPlayerHostiles = function () {
  if (!this.__playerHostiles) {
    const hostiles = this.find(FIND_HOSTILE_CREEPS)
    this.__playerHostiles = _.filter(hostiles, Room.isPlayerHazard)
  }
  return this.__playerHostiles
}

Room.prototype.getHostilesByPlayer = function () {
  if (!this.__hostilesByPlayer) {
    const hostiles = this.getPlayerHostiles()
    this.__hostilesByPlayer = {}
    for (const hostile of hostiles) {
      const owner = hostile.owner.username
      if (!this.__hostilesByPlayer[owner]) {
        this.__hostilesByPlayer[owner] = []
      }
      this.__hostilesByPlayer[owner].push(hostile)
    }
  }
  return this.__hostilesByPlayer
}

Room.isPlayerHazard = function (creep) {
  if (creep.owner.username === 'Invader' || creep.owner.username === 'Screeps') {
    return false
  }
  if (creep.my) {
    return false
  }
  return Room.isPotentialHazard(creep)
}

Room.isPotentialHazard = function (creep) {
  const hazardTypes = [ATTACK, RANGED_ATTACK, HEAL, WORK, CLAIM]
  return _.some(creep.body, b => _.include(hazardTypes, b.type))
}
