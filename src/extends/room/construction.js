'use strict'

global.SEGMENT_CONSTRUCTION = 'construction'

/* Room layouts are critical information so we want this segment available at all times */
sos.lib.vram.markCritical(SEGMENT_CONSTRUCTION)


global.STRUCTURE_LOADER = 'loader'
global.STRUCTURE_CRANE = 'crane'
var structureMap = [
  false,
  'spawn',
  'extension',
  'road',
  'constructedWall',
  'rampart',
  'link',
  'container',
  'tower',
  'lab',
  'observer',
  'powerSpawn',
  'extractor',
  'storage',
  'terminal',
  'nuker',
  'loader',
  'crane'
]


Room.getLayout = function (roomname) {
  return new RoomLayout(roomname)
}

Room.prototype.getLayout = function () {
  return Room.getLayout(this.name)
}


class RoomLayout {
  constructor (roomname) {
    this.roomname = roomname
    this.allStructures = false
  }

  planStructureAt (structureType, x, y, overrideRoads = false) {
    var currentStructure = this.getStructureAt(x, y)
    if(!!currentStructure) {
      if(!overrideRoads || currentStructure != STRUCTURE_ROAD) {
        return false
      }
    }
    var structureId = structureMap.indexOf(structureType)
    if(structureId < 1) {
      throw new Error('Unable to map structure to id for structure type ' + structureType)
    }
    var map = this._getStructureMap()
    map.set(x, y, structureId)
    if(!!this.allStructures) {
      if(!this.allStructures[structureType]) {
        this.allStructures[structureType] = []
      }
      this.allStructures[structureType].push(new RoomPosition(x, y, this.roomname))
    }
    return true
  }

  getStructureAt (x, y) {
    var map = this._getStructureMap()
    var structureId = map.get(x, y)
    if (!structureMap[structureId]) {
      return false
    }
    return structureMap[structureId]
  }

  getAllStructures () {
    if(!this.allStructures) {
      this.allStructures = {}
      for (var x = 0; x < 50; x++) {
        for (var y = 0; y < 50; y++) {
          var structure = this.getStructureAt(x, y)
          if(!!structure) {
            if(!this.allStructures[structure]) {
              this.allStructures[structure] = []
            }
            this.allStructures[structure].push(new RoomPosition(x, y, this.roomname))
          }
        }
      }
    }
    return this.allStructures
  }

  clear () {
    this.allStructures = false
    this.structureMap = new PathFinder.CostMatrix()
  }

  save () {
    var map = this._getStructureMap()
    var globalmap = sos.lib.vram.getData(SEGMENT_CONSTRUCTION)
    globalmap[this.roomname] = map.serialize()
    sos.lib.vram.markDirty(SEGMENT_CONSTRUCTION)
    this.unplanned = true
  }

  isPlanned () {
    this._getStructureMap()
    return !this.unplanned
  }

  visualize () {
    var structures = this.getAllStructures()
    var types = Object.keys(structures)
    var visual = new RoomVisual(this.roomname)
    for (var type of types) {
      for (var structure_pos of structures[type]) {
        visual.structure(structure_pos.x, structure_pos.y, type, {'opacity': 0.60})
      }
    }
  }

  _getStructureMap () {
    if(!this.structureMap) {
      var map = sos.lib.vram.getData(SEGMENT_CONSTRUCTION)
      if (Number.isInteger(map)) {
        throw new Error('Room structure maps are not available')
      }
      if(!!map[this.roomname]) {
        this.structureMap = PathFinder.CostMatrix.deserialize(map[this.roomname])
        this.unplanned = false
      } else {
        this.structureMap = new PathFinder.CostMatrix()
        this.unplanned = true
      }
    }
    return this.structureMap
  }
}
