'use strict'

global.SEGMENT_CONSTRUCTION = 'construction'
global.SEGMENT_RAMPARTS = 'ramparts'

/* Room layouts are critical information so we want this segment available at all times */
sos.lib.vram.markCritical(SEGMENT_CONSTRUCTION)
sos.lib.vram.markCritical(SEGMENT_RAMPARTS)

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
  STRUCTURE_ROAD,
  STRUCTURE_WALL,
  STRUCTURE_RAMPART,
  STRUCTURE_CONTAINER
]

const orderStructures = [
  STRUCTURE_SPAWN,
  STRUCTURE_STORAGE,
  STRUCTURE_TOWER,
  STRUCTURE_EXTENSION,
  STRUCTURE_CONTAINER,
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

  if (structureType === STRUCTURE_LINK) {
    const storage = this.storage

    if (storage.getLink()) {
      const sources = this.find(FIND_SOURCES)
      sources.sort((a, b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage))

      // first mine link
      if (!sources[0].getLink()) {
        const pos = sources[0].getLinkPosition()
        Logger.log(`first mine(${sources[0]}) link: ${sources[0].getLink()} at ${pos}`, LOG_TRACE, 'construction')
        return [this.createConstructionSite(pos, STRUCTURE_LINK), structureType, pos]
      }

      // controller link
      if (!this.controller.getLink()) {
        const pos = this.controller.getLinkPosition()
        Logger.log(`controller(${this.controller}) link: ${this.controller.getLink()} at ${pos}`, LOG_TRACE, 'construction')
        return [this.createConstructionSite(pos, STRUCTURE_LINK), structureType, pos]
      }

      // second mine link
      if (sources[1] && !sources[1].getLink()) {
        const pos = sources[1].getLinkPosition()
        Logger.log(`second mine(${sources[1]}) link: ${sources[1].getLink()} at ${pos}`, LOG_TRACE, 'construction')
        return [this.createConstructionSite(pos, STRUCTURE_LINK), structureType, pos]
      }
    }

    // Fall back to standard planned structure checks.
    // First storage, then flowers.
  }

  // Extractors are always built in minerals and thus aren't planned.
  if (structureType === STRUCTURE_EXTRACTOR) {
    const minerals = this.find(FIND_MINERALS)
    if (minerals.length <= 0) {
      return false
    }
    const pos = minerals[0].pos
    Logger.log(`extractor: ${minerals[0]} at ${pos}`, LOG_TRACE, 'construction')
    return [this.createConstructionSite(pos, STRUCTURE_EXTRACTOR), structureType, pos]
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
  const pos = structurePositions[0]
  Logger.log(`generic structure: ${structureType} at ${pos}`, LOG_TRACE, 'construction')
  return [this.createConstructionSite(pos, structureType), structureType, pos]
}

Room.prototype.getNextMissingStructureType = function () {
  if (!this.controller) {
    return false
  }
  const structureCount = this.getStructureCount(FIND_STRUCTURES)
  const constructionCount = this.getConstructionCount()
  let nextLevel = this.getPracticalRoomLevel() + 1
  if (!LEVEL_BREAKDOWN[nextLevel]) {
    nextLevel = 8
  }
  const nextLevelStructureCount = LEVEL_BREAKDOWN[nextLevel]
  const structures = Object.keys(nextLevelStructureCount)

  // Priority.
  structures.sort(function (a, b) {
    return (orderStructures.indexOf(a) < orderStructures.indexOf(b) ? -1 : 1)
  })

  // Get room layout, if it exists, and use that to check which planned structureTypes are missing.
  const layout = this.getLayout()
  if (!layout.isPlanned()) {
    return false
  }
  const allStructurePositions = layout.getAllStructures()
  const sources = this.find(FIND_SOURCES)
  // Build all other structures.
  let structureType
  for (structureType of structures) {
    if (this.getRoomSetting(`SKIP_STRUCTURE_${structureType}`)) {
      continue
    }
    if (!nextLevelStructureCount[structureType] || nextLevelStructureCount[structureType] <= 0) {
      continue
    }
    if (!allStructurePositions[structureType] || allStructurePositions[structureType].length <= 0) {
      if (structureType !== STRUCTURE_EXTRACTOR) {
        continue
      }
    }
    const currentStructures = structureCount[structureType] || 0
    const constructionStructures = constructionCount[structureType] || 0
    const totalStructures = currentStructures + constructionStructures

    if (totalStructures >= LEVEL_BREAKDOWN[this.controller.level][structureType]) {
      continue
    }

    if (totalStructures < nextLevelStructureCount[structureType]) {
      if (structureType === STRUCTURE_LINK) {
        if (totalStructures < (allStructurePositions[structureType].length + sources.length + 1)) {
          return structureType
        }
      }
      if (structureType === STRUCTURE_EXTRACTOR || totalStructures < allStructurePositions[structureType].length) {
        return structureType
      }
    }
  }
  return false
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

Room.prototype.getConstructionCount = function (constructionFind = FIND_MY_CONSTRUCTION_SITES) {
  const sites = this.find(constructionFind)
  const counts = {}
  let site
  for (site of sites) {
    if (!counts[site.structureType]) {
      counts[site.structureType] = 0
    }
    counts[site.structureType]++
  }
  return counts
}

Room.prototype.getPracticalRoomLevel = function () {
  const prl = sos.lib.cache.get(`${this.name}.prl`)
  if (prl) {
    return prl
  }
  const structureCount = this.getStructureCount(FIND_STRUCTURES)
  let level
  for (level = 1; level < 8; level++) {
    const neededStructures = Object.keys(LEVEL_BREAKDOWN[level + 1])
    let structureType
    for (structureType of neededStructures) {
      if (skipStructures.indexOf(structureType) !== -1 || structureType === STRUCTURE_LINK) {
        continue
      }
      if (LEVEL_BREAKDOWN[level + 1][structureType] > 0) {
        if (!structureCount[structureType] || structureCount[structureType] < LEVEL_BREAKDOWN[level + 1][structureType]) {
          sos.lib.cache.set(`${this.name}.prl`, level, {
            maxttl: 30,
            persist: true
          })
          return level
        }
      }
    }
  }
  sos.lib.cache.set(`${this.name}.prl`, 8, {
    maxttl: 30,
    persist: true
  })
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
    this.terrain = Game.map.getRoomTerrain(roomname)
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

    if (this._getSegmentLabel() === SEGMENT_CONSTRUCTION) {
      if (this.allStructures[STRUCTURE_CONTAINER] && this.allStructures[STRUCTURE_ROAD]) {
        for (const position of this.allStructures[STRUCTURE_CONTAINER]) {
          this.allStructures[STRUCTURE_ROAD].push(position)
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
    const label = this._getSegmentLabel()
    const globalmap = sos.lib.vram.getData(label)
    globalmap[this.roomname] = map.serialize()
    sos.lib.vram.markDirty(label)
    this.unplanned = false
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
          opacity: 0.60
        })
      }
    }
  }

  _getSegmentLabel () {
    return SEGMENT_CONSTRUCTION
  }

  _getStructureMap () {
    if (!this.structureMap) {
      const map = sos.lib.vram.getData(this._getSegmentLabel())
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

Room.getDefenseMap = function (roomname) {
  return new DefenseMap(roomname)
}

Room.prototype.getDefenseMap = function () {
  return Room.getDefenseMap(this.name)
}

const defenseColors = {}
global.RAMPART_PATHWAY = 1
defenseColors[RAMPART_PATHWAY] = '#EEEE88'

global.RAMPART_EDGE = 2
defenseColors[RAMPART_EDGE] = '#DD4545'

global.RAMPART_SECONDARY_STRUCTURES = 3
defenseColors[RAMPART_SECONDARY_STRUCTURES] = '#FFD000'

global.RAMPART_PRIMARY_STRUCTURES = 4
defenseColors[RAMPART_PRIMARY_STRUCTURES] = '#FF8B00'

global.RAMPART_CONTROLLER = 5
defenseColors[RAMPART_CONTROLLER] = '#71daae'

global.RAMPART_GATEWAY = 6
defenseColors[RAMPART_GATEWAY] = '#78ff00'

global.WALL_GATEWAY = 7
defenseColors[WALL_GATEWAY] = '#909090'

const primaryStructures = [
  STRUCTURE_SPAWN,
  STRUCTURE_STORAGE,
  STRUCTURE_TERMINAL,
  STRUCTURE_TOWER
]

const excludeStructures = [
  STRUCTURE_ROAD,
  STRUCTURE_CONTAINER
]

const pathwayDistance = 1
const pathwaySpawnDistance = 2
const controllerPathway = 0

const REACHABLE_SPACE = 3
const QUEUED_SPACE = 1
const TESTED_SPACE = 2

class DefenseMap extends RoomLayout {
  generate () {
    const room = Game.rooms[this.roomname]
    if (!room) {
      return false
    }
    this.clear()
    const layout = Room.getLayout(this.roomname)
    const structures = layout.getAllStructures()
    const map = this.structureMap
    // Add Structure and Pathway ramparts.
    const pathways = []
    for (const structureType of Object.keys(structures)) {
      if (excludeStructures.includes(structureType)) {
        continue
      }
      const type = primaryStructures.includes(structureType) ? RAMPART_PRIMARY_STRUCTURES : RAMPART_SECONDARY_STRUCTURES
      for (const structurePosition of structures[structureType]) {
        map.set(structurePosition.x, structurePosition.y, type)
        const distance = structureType === STRUCTURE_SPAWN ? pathwaySpawnDistance : pathwayDistance
        const neighbors = structurePosition.getSteppableAdjacentInRange(distance)
        for (const neighbor of neighbors) {
          const structure = layout.getStructureAt(neighbor.x, neighbor.y)
          if (!structure || excludeStructures.includes(structure)) {
            map.set(neighbor.x, neighbor.y, RAMPART_PATHWAY)
            pathways.push(neighbor)
          }
        }
      }
    }
    // Add controller ramparts and pathways (if paths are enabled for controllers).
    const controllerRange = controllerPathway < 1 ? 1 : controllerPathway
    const controllerNeighbors = room.controller.pos.getSteppableAdjacentInRange(controllerRange)
    for (const neighbor of controllerNeighbors) {
      const type = room.controller.pos.getRangeTo(neighbor) > 1 ? RAMPART_PATHWAY : RAMPART_CONTROLLER
      if (type === RAMPART_PATHWAY) {
        pathways.push(neighbor)
      }
      map.set(neighbor.x, neighbor.y, type)
    }

    // Detect edges from existing pathways
    const walkableMap = this._getWalkableMap(room, map)
    for (const position of pathways) {
      const neighbors = position.getSteppableAdjacent()
      for (const neighbor of neighbors) {
        if (walkableMap.get(neighbor.x, neighbor.y) === REACHABLE_SPACE) {
          map.set(position.x, position.y, RAMPART_EDGE)
          break
        }
      }
    }

    // plan walls around each exit, hugging them directly.
    // This *has* to be done after edge calculatons
    const exits = this.roomname === 'sim' ? ['1', '3', '5', '7']
                                          : Object.keys(Game.map.describeExits(this.roomname)) // eslint-disable-line indent
    for (let exit of exits) {
      exit = parseInt(exit)
      const pieces = this._getExitPieces(exit)

      for (const piece of pieces) {
        const horizontal = (exit === TOP || exit === BOTTOM)
        if (horizontal) {
          const endpointOffset = exit === TOP ? 1 : -1
          const y = piece[0].y
          const left1 = new RoomPosition(piece[0].x - 1, y, this.roomname)
          const left2 = new RoomPosition(piece[0].x - 2, y, this.roomname)
          if (this.terrain.get(piece[0].x - 2, y + endpointOffset) !== TERRAIN_MASK_WALL) {
            map.set(piece[0].x - 2, y + endpointOffset, WALL_GATEWAY)
          }
          const lastPiece = piece.length - 1
          const right1 = new RoomPosition(piece[lastPiece].x + 1, y, this.roomname)
          const right2 = new RoomPosition(piece[lastPiece].x + 2, y, this.roomname)
          if (this.terrain.get(piece[lastPiece].x + 2, y + endpointOffset) !== TERRAIN_MASK_WALL) {
            map.set(piece[lastPiece].x + 2, y + endpointOffset, WALL_GATEWAY)
          }
          piece.unshift(left1)
          piece.unshift(left2)
          piece.push(right1)
          piece.push(right2)
        } else {
          const endpointOffset = exit === LEFT ? 1 : -1
          const x = piece[0].x
          const top1 = new RoomPosition(x, piece[0].y - 1, this.roomname)
          const top2 = new RoomPosition(x, piece[0].y - 2, this.roomname)
          if (this.terrain.get(x + endpointOffset, piece[0].y - 2) !== TERRAIN_MASK_WALL) {
            map.set(x + endpointOffset, piece[0].y - 2, WALL_GATEWAY)
          }
          const lastPiece = piece.length - 1
          const bottom1 = new RoomPosition(x, piece[lastPiece].y + 1, this.roomname)
          const bottom2 = new RoomPosition(x, piece[lastPiece].y + 2, this.roomname)
          if (this.terrain.get(x + endpointOffset, piece[lastPiece].y + 2) !== TERRAIN_MASK_WALL) {
            map.set(x + endpointOffset, piece[lastPiece].y + 2, WALL_GATEWAY)
          }
          piece.unshift(top1)
          piece.unshift(top2)
          piece.push(bottom1)
          piece.push(bottom2)
        }

        const set = (position, type) => {
          let x, x1, x2
          let y, y1, y2
          if (horizontal) {
            x = position.x
            y = position.y + (exit === TOP ? 2 : -2)
            x1 = x
            y1 = y + (exit === TOP ? -1 : 1)
            x2 = x
            y2 = y + (exit === TOP ? 1 : -1)
          } else {
            x = position.x + (exit === LEFT ? 2 : -2)
            y = position.y
            x1 = x + (exit === LEFT ? -1 : 1)
            y1 = y
            x2 = x + (exit === LEFT ? 1 : -1)
            y2 = y
          }
          // This overrides ramparts with walls if there is a wall blocking it.
          // It doesn't account for diagonal movement, which is probably ok.
          if (this.terrain.get(x, y) !== TERRAIN_MASK_WALL) {
            const outer = this.terrain.get(x1, y1) === TERRAIN_MASK_WALL
            const inner = this.terrain.get(x2, y2) === TERRAIN_MASK_WALL
            if (outer) {
              map.set(x, y, WALL_GATEWAY)
            } else if (inner && !outer) {
              map.set(x, y, RAMPART_GATEWAY)
            } else {
              map.set(x, y, type)
            }
          }
        }
        // This results in a look like the following:
        // (W = Wall, X = Exit, C = Constructed Wall, R = Rampart)
        //
        // WCCRCCRCRC   CRCRCRCRCRCRC   WWCRCRCRC
        // WW       C   C           W   WW      C
        // WWXXXXXXWW   WWXXXXXXXXXWW   WWXXXXXWW
        let type = RAMPART_GATEWAY
        for (let i = 0; i < piece.length / 2; i++) {
          type = type !== RAMPART_GATEWAY ? RAMPART_GATEWAY : WALL_GATEWAY
          set(piece[i], type)
          set(piece[piece.length - i - 1], type)
        }
      }
    }
  }

  _getExitPieces (exit) {
    const vertical = exit === LEFT || exit === RIGHT
    let stationary
    if (vertical) {
      stationary = exit === LEFT ? 0 : 49
    } else {
      stationary = exit === TOP ? 0 : 49
    }

    const pieces = []
    let currentPiece = []
    for (var i = 0; i <= 49; i++) {
      const x = vertical ? stationary : i
      const y = vertical ? i : stationary
      const isExit = this.terrain.get(x, y) !== TERRAIN_MASK_WALL
      if (isExit) {
        currentPiece.push(new RoomPosition(x, y, this.roomname))
      } else if (currentPiece.length > 0) {
        pieces.push(currentPiece)
        currentPiece = []
      }
    }
    if (currentPiece.length > 0) {
      pieces.push(currentPiece)
    }
    return pieces
  }

  // Using a room and a rampart map (CostMatrix) this generates a list of positions reachable from an exit.
  _getWalkableMap (room, map) {
    const tested = []
    const queue = []
    const walkableMap = new PathFinder.CostMatrix()

    // Add exit squares as starting points.
    const exits = room.find(FIND_EXIT)
    for (const exit of exits) {
      walkableMap.set(exit.x, exit.y, QUEUED_SPACE)
      queue.push(exit)
    }

    while (queue.length > 0) {
      const current = queue.pop()
      tested.push(current.serialize())

      // If the value is greater than zero it has already been tested or is blocked by ramparts
      if (map.get(current.x, current.y) || walkableMap.get(current.x, current.y) >= TESTED_SPACE) {
        continue
      }

      // This square is reachable so mark it as such
      walkableMap.set(current.x, current.y, REACHABLE_SPACE)

      // Add the walkable neighbors into the queue after checking that they haven't been added or tested already
      const neighbors = current.getSteppableAdjacent()
      for (const neighbor of neighbors) {
        if (walkableMap.get(neighbor.x, neighbor.y) >= QUEUED_SPACE) {
          continue
        }
        queue.push(neighbor)
        walkableMap.set(neighbor.x, neighbor.y, QUEUED_SPACE)
      }
    }
    return walkableMap
  }

  getStructureAt (x, y) {
    const map = this._getStructureMap()
    const structureId = map.get(x, y)
    return structureId || false
  }

  _getSegmentLabel () {
    return SEGMENT_RAMPARTS
  }

  visualize () {
    const structures = this.getAllStructures()
    const types = Object.keys(structures)
    const visual = new RoomVisual(this.roomname)
    let type, structurePos
    for (type of types) {
      if (!defenseColors[type]) {
        continue
      }
      const structureType = type === WALL_GATEWAY ? STRUCTURE_WALL : STRUCTURE_RAMPART
      for (structurePos of structures[type]) {
        visual.structure(structurePos.x, structurePos.y, structureType, {
          opacity: 0.60,
          rampart: defenseColors[type]
        })
      }
    }
  }
}
