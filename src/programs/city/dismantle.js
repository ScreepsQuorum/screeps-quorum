'use strict'


class CityDismantle extends kernel.process {
    constructor (...args) {
      super(...args)
      this.priority = PRIORITIES_DEFAULT
    }
    getDescriptor () {
        return `Dismantling ${this.structure} in ${this.data.room}`
      }
    
      main () {
        if (!Game.rooms[this.data.room]) {
            return this.suicide()
        }
        if(this.room.find(FIND_FLAGS, { filter: { name: "dismantle" } }).length === 0) {
            return this.suicide
          }

        this.room = Game.rooms[this.data.room]
        this.flag = this.room.find(FIND_FLAGS, { filter: { name: "dismantle" } })[0]

        const target = this.flag.pos.findClosestByRange(FIND_STRUCTURES);
        if (target.pos != this.flag.pos) {
            return this.suicide
        }

        const dismantler = this.getCluster(`dismantler`, this.room)

        dismantler.sizeCluster('dismantler', 2)
        let storage
        if (this.room.storage && target != this.room.storage) {
          storage = this.room.storage
        } else if (this.room.terminal && target != this.room.terminal) {
          storage = this.room.terminal
        } else {
            const containers = this.room.structures[STRUCTURE_CONTAINER]
            if (containers && containers.length > 0) {    
                if (containers.length > 1) {
                    containers.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY])
                }
                storage = containers[0]
            }
        }
        
        
        dismantler.forEach(function (creep) {
            if (creep.ticksToLive < 10) {
                creep.recycle()
                return
            }
            if (creep.getCarryPercentage() > 1) {
                if (!creep.pos.isNearTo(storage)) {
                    creep.travelTo(storage)
                } else {
                    creep.store.forEach( r => {
                        creep.transferAll(storage, r)
                    })
                }
                return
            }
            if (!creep.pos.isNearTo(target)) {
                creep.travelTo(target)
                return
            }
            if (creep.pos.isNearTo(target)) {
                if(target.store && target.store.getUsedCapacity() > 0) {
                    target.store.forEach( resource => {
                        creep.withdraw(resource)
                        if (creep.store.getFreeCapacity() > 0) {
                            return
                        }
                    })
                } else {
                    creep.dismantle(target)
                }
            }
        })
    }
}



export default CityDismantle
