'use strict'

global.SEGMENT_CONSTRUCTION = 'construction'

/* Room layouts are critical information so we want this segment available at all times */
sos.lib.vram.markCritical(SEGMENT_CONSTRUCTION)

global.STRUCTURE_LOADER = 'loader'
global.STRUCTURE_CRANE = 'crane'
const structureMap = [
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

const structures = Object.keys(CONTROLLER_STRUCTURES)
const skipStructures = [
  STRUCTURE_WALL,
  STRUCTURE_RAMPART,
  STRUCTURE_CONTAINER
]

const orderStructures = [
  STRUCTURE_SPAWN,
  STRUCTURE_TOWER,
  STRUCTURE_EXTENSION,
  STRUCTURE_CONTAINER,
  STRUCTURE_STORAGE,
  STRUCTURE_LINK,
  STRUCTURE_WALL,
  STRUCTURE_EXTRACTOR,
  STRUCTURE_TERMINAL,
  STRUCTURE_LAB,
  STRUCTURE_RAMPART,
  STRUCTURE_OBSERVER,
  STRUCTURE_NUKER,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_ROAD
]

global.LEVEL_BREAKDOWN = {}
let structure
for (structure of structures) {
  if (skipStructures.indexOf(structure) !== -1) {
    continue
  }
  const levels = Object.keys(CONTROLLER_STRUCTURES[structure])
  let level
  for (level of levels) {
    if (!LEVEL_BREAKDOWN[level]) {
      LEVEL_BREAKDOWN[level] = {}
    }
    LEVEL_BREAKDOWN[level][structure] = CONTROLLER_STRUCTURES[structure][level]
  }
}

Room.prototype.constructNextMissingStructure = function () {
  const structureType = this.getNextMissingStructureType()
  if (!structureType) {
    return false
  }

  // Extractors are always built in minerals and thus aren't planned.
  if (structureType === STRUCTURE_EXTRACTOR) {
    const minerals = this.find(FIND_MINERALS)
    if (minerals.length <= 0) {
      return false
    }
    return this.createConstructionSite(minerals[0].pos, STRUCTURE_EXTRACTOR)
  }

  // Get room layout, if it exists, and use that to get structure positions.
  const layout = this.getLayout()
  if (!layout.isPlanned()) {
    return false
  }
  const allStructurePositions = layout.getAllStructures()
  if (!allStructurePositions[structureType]) {
    return false
  }

  const structurePositions = _.filter(allStructurePositions[structureType], function (position) {
    const structures = position.lookFor(LOOK_STRUCTURES)
    if (!structures || structures.length <= 0) {
      return true
    }
    let structure
    for (structure of structures) {
      if (structure.structureType === structureType) {
        return false
      }
    }
    return true
  })

  // Prioritize structures based on distance to storage- closer ones get built first.
  if (allStructurePositions[STRUCTURE_STORAGE]) {
    const storagePosition = allStructurePositions[STRUCTURE_STORAGE][0]
    structurePositions.sort(function (a, b) {
      return a.getManhattanDistance(storagePosition) - b.getManhattanDistance(storagePosition)
    })
  }
  return this.createConstructionSite(structurePositions[0], structureType)
}

Room.prototype.getNextMissingStructureType = function () {
  if (!this.isMissingStructures()) {
    return false
  }
  const structureCount = this.getStructureCount()
  const nextLevel = this.getPracticalRoomLevel() + 1
  const nextLevelStructureCount = LEVEL_BREAKDOWN[nextLevel]
  const structures = Object.keys(nextLevelStructureCount)

  // Priority.
  structures.sort(function (a, b) {
    return (orderStructures.indexOf(a) < orderStructures.indexOf(b) ? -1 : 1)
  })

  // Build all other structures.
  let structureType
  for (structureType of structures) {
    if (skipStructures.indexOf(structureType) !== -1 || structureType === STRUCTURE_LINK) {
      continue
    }
    if (!nextLevelStructureCount[structureType] || nextLevelStructureCount[structureType] <= 0) {
      continue
    }
    if (!structureCount[structureType] || structureCount[structureType] < nextLevelStructureCount[structureType]) {
      return structureType
    }
  }
  return false
}

Room.prototype.isMissingStructures = function () {
  return this.getPracticalRoomLevel() < this.controller.level
}

Room.prototype.getStructureCount = function (structureFind = FIND_MY_STRUCTURES) {
  const structures = this.find(structureFind)
  const counts = {}
  let structure
  for (structure of structures) {
    if (!counts[structure.structureType]) {
      counts[structure.structureType] = 0
    }
    counts[structure.structureType]++
  }
  return counts
}

Room.prototype.getPracticalRoomLevel = function () {
  if (this.__level) {
    return this.__level
  }
  const structureCount = this.getStructureCount(FIND_STRUCTURES)
  let level
  for (level = 1; level < 8; level++) {
    const neededStructures = Object.keys(LEVEL_BREAKDOWN[level + 1])
    let structureType
    for (structureType of neededStructures) {
      if (structureType === STRUCTURE_LINK) {
        continue
      }
      if (LEVEL_BREAKDOWN[level + 1][structureType] > 0) {
        if (!structureCount[structureType] || structureCount[structureType] < LEVEL_BREAKDOWN[level + 1][structureType]) {
          this.__level = level
          return level
        }
      }
    }
  }
  this.__level = 8
  return 8
}

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
    const currentStructure = this.getStructureAt(x, y)
    if (currentStructure) {
      if (!overrideRoads || currentStructure !== STRUCTURE_ROAD) {
        return false
      }
    }
    const structureId = structureMap.indexOf(structureType)
    if (structureId < 1) {
      throw new Error('Unable to map structure to id for structure type ' + structureType)
    }
    const map = this._getStructureMap()
    map.set(x, y, structureId)
    if (this.allStructures) {
      if (!this.allStructures[structureType]) {
        this.allStructures[structureType] = []
      }
      this.allStructures[structureType].push(new RoomPosition(x, y, this.roomname))
    }
    return true
  }

  getStructureAt (x, y) {
    const map = this._getStructureMap()
    const structureId = map.get(x, y)
    if (!structureMap[structureId]) {
      return false
    }
    return structureMap[structureId]
  }

  getAllStructures () {
    if (!this.allStructures) {
      this.allStructures = {}
      let x,
        y
      for (x = 0; x < 50; x++) {
        for (y = 0; y < 50; y++) {
          const structure = this.getStructureAt(x, y)
          if (structure) {
            if (!this.allStructures[structure]) {
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
    const map = this._getStructureMap()
    const globalmap = sos.lib.vram.getData(SEGMENT_CONSTRUCTION)
    globalmap[this.roomname] = map.serialize()
    sos.lib.vram.markDirty(SEGMENT_CONSTRUCTION)
    this.unplanned = true
  }

  isPlanned () {
    this._getStructureMap()
    return !this.unplanned
  }

  visualize () {
    const structures = this.getAllStructures()
    const types = Object.keys(structures)
    const visual = new RoomVisual(this.roomname)
    let type, structurePos
    for (type of types) {
      for (structurePos of structures[type]) {
        visual.structure(structurePos.x, structurePos.y, type, {
          'opacity': 0.60
        })
      }
    }
  }

  _getStructureMap () {
    if (!this.structureMap) {
      const map = sos.lib.vram.getData(SEGMENT_CONSTRUCTION)
      if (Number.isInteger(map)) {
        throw new Error('Room structure maps are not available')
      }
      if (map[this.roomname]) {
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
