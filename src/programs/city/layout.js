'use strict'

const distanceTransform = require('thirdparty_distancetransform')

/**
 * Plan room structures
 */

const LAYOUT_CORE_BUFFER = 4 // CEIL(radius)
// Keep spawn center for first room.
const LAYOUT_CORE = [
  [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER],
  [
    STRUCTURE_TOWER,
    STRUCTURE_LOADER,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD
  ],
  [
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL,
    STRUCTURE_STORAGE,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD
  ],
  [
    STRUCTURE_ROAD,
    STRUCTURE_OBSERVER,
    STRUCTURE_NUKER,
    STRUCTURE_CRANE,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_SPAWN,
    STRUCTURE_ROAD
  ],
  [
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_ROAD,
    STRUCTURE_SPAWN,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD
  ],
  [
    null,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD
  ],
  [
    null,
    STRUCTURE_ROAD,
    STRUCTURE_SPAWN,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_LAB,
    STRUCTURE_ROAD,
    STRUCTURE_LAB,
    STRUCTURE_ROAD
  ],
  [
    null,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
    STRUCTURE_LAB,
    STRUCTURE_ROAD,
    STRUCTURE_LAB,
    STRUCTURE_ROAD,
    STRUCTURE_LAB
  ],
  [
    null,
    null,
    null,
    null,
    STRUCTURE_LAB,
    STRUCTURE_LAB,
    STRUCTURE_LAB,
    STRUCTURE_LAB,
    STRUCTURE_LAB
  ]
]

const LAYOUT_FLOWER_BUFFER = 3 // CEIL(radius)
const LAYOUT_FLOWER = [
  [
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_LINK,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION
  ],
  [
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION
  ],
  [
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null
  ]
]

class CityLayout extends kernel.process {
  constructor (...args) {
    super(...args)
    this.priority = PRIORITIES_CONSTRUCTION
  }

  getDescriptor () {
    return this.data.room
  }

  main () {
    if (!Game.rooms[this.data.room]) {
      return this.suicide()
    }

    this.room = Game.rooms[this.data.room]
    const layout = this.room.getLayout()
    if (layout.isPlanned()) {
      Logger.log(`Room ${this.data.room} already planned`, LOG_ERROR)
      layout.visualize()
      return this.suicide()
    }

    // Check for existing spawns in case this is the first room.
    const spawns = this.room.find(FIND_MY_SPAWNS)
    this.corePos = spawns.length > 0 ? spawns[0].pos : false

    // Iterate through plans, trying each one multiple times before moving on.
    const plans = [
      'nearController',
      'randomCore',
      'randomAll'
    ]
    if (!this.data.plan) {
      this.data.plan = 0
    }
    if (!this.data.attempts) {
      this.data.attempts = 0
    }
    if (this.data.attempts > 15) {
      this.data.plan++
      this.data.attempts = 0
    }
    if (this.data.plan >= plans.length) {
      // Room probably can't support things
      Logger.log(`Unable to come up with a layout for ${this.room.name}`, LOG_ERROR)
      return this.suicide()
    }

    // Actually run layout planning attempt.
    this.data.attempts++
    this[plans[this.data.plan]]()
  }

  /**
   * Try to place the core structures as close to the controller as possible, with the flower structures as close to
   * the core structures as can be managed.
   */
  nearController () {
    let baseMatrix = this.getBaseMatrix()
    let dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get core structures */
    const corePosition = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER, function (a, b) {
      return a.getRangeTo(Game.rooms[a.roomName].controller) - b.getRangeTo(Game.rooms[b.roomName].controller)
    })
    if (!corePosition) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, corePosition, LAYOUT_CORE_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function (a, b) {
      return a.getRangeTo(corePosition) - b.getRangeTo(corePosition)
    })
    if (!flower1Position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1Position, LAYOUT_FLOWER_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower2 structures */
    const flower2Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function (a, b) {
      const aRange = a.getRangeTo(corePosition)
      const bRange = b.getRangeTo(corePosition)
      if (aRange === bRange) {
        return a.getRangeTo(flower1Position) - b.getRangeTo(flower1Position)
      }
      return aRange - bRange
    })
    if (!flower2Position) {
      return false
    }

    return this.planLayout(corePosition, flower1Position, flower2Position)
  }

  /**
   * Place the core structures anywhere they'll fit, with the flower structures as close to the core structures as can
   * be managed.
   */
  randomCore () {
    let baseMatrix = this.getBaseMatrix()
    let dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get core structures */
    const corePosition = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER)
    if (!corePosition) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, corePosition, LAYOUT_CORE_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function (a, b) {
      return a.getRangeTo(corePosition) - b.getRangeTo(corePosition)
    })
    if (!flower1Position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1Position, LAYOUT_FLOWER_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower2 structures */
    const flower2Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function (a, b) {
      const aRange = a.getRangeTo(corePosition)
      const bRange = b.getRangeTo(corePosition)
      if (aRange === bRange) {
        return a.getRangeTo(flower1Position) - b.getRangeTo(flower1Position)
      }
      return aRange - bRange
    })
    if (!flower2Position) {
      return false
    }

    return this.planLayout(corePosition, flower1Position, flower2Position)
  }

  /**
   * Place core structures and flower structures anywhere they will fit.
   */
  randomAll () {
    let baseMatrix = this.getBaseMatrix()
    let dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get core structures */
    const corePosition = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER)
    if (!corePosition) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, corePosition, LAYOUT_CORE_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER)
    if (!flower1Position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1Position, LAYOUT_FLOWER_BUFFER)
    dt = distanceTransform.distanceTransform(baseMatrix)

    /* Get flower2 structures */
    const flower2Position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER)
    if (!flower2Position) {
      return false
    }

    return this.planLayout(corePosition, flower1Position, flower2Position)
  }

  /**
   * Convert the positions and templates into an actual RoomLayout and save it.
   */
  planLayout (corePos, flower1Pos, flower2Pos) {
    const layout = Room.getLayout(this.data.room)

    const coreAdjusted = new RoomPosition(corePos.x - LAYOUT_CORE_BUFFER, corePos.y - LAYOUT_CORE_BUFFER, this.data.room)
    this.planStructureMatrix(layout, coreAdjusted, LAYOUT_CORE, (2 * LAYOUT_CORE_BUFFER) + 1)

    const flower1Adjusted = new RoomPosition(flower1Pos.x - LAYOUT_FLOWER_BUFFER, flower1Pos.y - LAYOUT_FLOWER_BUFFER, this.data.room)
    this.planStructureMatrix(layout, flower1Adjusted, LAYOUT_FLOWER, (2 * LAYOUT_FLOWER_BUFFER) + 1)

    const flower2Adjusted = new RoomPosition(flower2Pos.x - LAYOUT_FLOWER_BUFFER, flower2Pos.y - LAYOUT_FLOWER_BUFFER, this.data.room)
    this.planStructureMatrix(layout, flower2Adjusted, LAYOUT_FLOWER, (2 * LAYOUT_FLOWER_BUFFER) + 1)

    if (!this.planRoads(layout, corePos, flower1Pos, flower2Pos)) return this.suicide()

    layout.save()
    Logger.log(`Room planning for room ${this.data.room} has successfully completed`)
    return this.suicide()
  }

  /**
   * Adds a predefined template of structures to a layout starting from the specific position.
   */
  planStructureMatrix (layout, leftCorner, matrix, size = false) {
    if (!size) {
      size = matrix.length
    }
    let row,
      column
    for (row = 0; row < size; row++) {
      if (!matrix[row]) {
        continue
      }
      for (column = 0; column < size; column++) {
        if (!matrix[row][column]) {
          continue
        }
        const structure = matrix[row][column]
        layout.planStructureAt(structure, leftCorner.x + column, leftCorner.y + row)
        if (structure !== STRUCTURE_ROAD && OBSTACLE_OBJECT_TYPES.indexOf(structure) === -1) {
          layout.planStructureAt(STRUCTURE_ROAD, leftCorner.x + column, leftCorner.y + row)
        }
      }
    }
  }

  /**
   * Plan roads from the core to the flowers and major room features (controller, sources, minerals).
   */
  planRoads (layout, corePos, flower1Pos, flower2Pos) {
    Logger.log(`Planning roads for room: ${this.data.room}`, LOG_INFO, 'layout')
    const matrix = this.getConstructionMatrix(layout)
    this.planRoad(layout, corePos, flower1Pos, matrix)
    this.planRoad(layout, corePos, flower2Pos, matrix)
    if (this.room.controller) {
      if (!this.planRoad(layout, corePos, this.room.controller.pos, matrix)) return false
    }
    const sources = this.room.find(FIND_SOURCES)
    let source
    for (source of sources) {
      if (!this.planRoad(layout, corePos, source.pos, matrix)) return false
    }
    const minerals = this.room.find(FIND_MINERALS)
    let mineral
    for (mineral of minerals) {
      if (!this.planRoad(layout, corePos, mineral.pos, matrix)) return false
    }
    return true
  }

  /*
   * Plan a road between the given two positions within the same room.
   * If a costMatrix is given, that will be used instead of generating a new one from the given layout's current state.
   */
  planRoad (layout, fromPos, toPos, matrix) {
    if (!matrix) matrix = this.getConstructionMatrix(layout)
    let path = PathFinder.search(fromPos, { pos: toPos, range: 1 }, { plainCost: 3, swampCost: 4, maxRooms: 1, maxOps: 6000, roomCallback: (roomName) => { if (roomName !== this.data.room) { return false } else { return matrix } } })
    if (!path || path.incomplete) path = PathFinder.search(fromPos, { pos: toPos, range: 1 }, { plainCost: 3, swampCost: 3, maxRooms: 1, maxOps: 6000, roomCallback: (roomName) => { if (roomName !== this.data.room) { return false } else { return matrix } }, heuristicWeight: 1.5 })
    let spot
    if (!path.path || path.path.length < 1) {
      Logger.log(`Unable to find path for road from: ${fromPos} to: ${toPos} in room: ${this.data.room} path returned was: ${JSON.stringify(path)}`, LOG_ERROR, 'layout')
      return false
    } else Logger.log(`Planning road from: ${fromPos} to: ${toPos} in room: ${this.data.room} with length ${path.path.length}`, LOG_INFO, 'layout')
    for (spot of path.path) {
      if (spot.isSteppable() && !spot.isExit() && layout.planStructureAt(STRUCTURE_ROAD, spot.x, spot.y)) matrix.set(spot.x, spot.y, 1)
    }
    return true
  }

  /**
   * Generate a road construction costMatrix from the given layout.
   * Only structures in the layout are taken into consideration, unplanned existing structures are ignored. (maybe not ideal, discuss)
   */
  getConstructionMatrix (layout) {
    const costMatrix = new PathFinder.CostMatrix()
    let x,
      y,
      plannedStruct
    for (x = 1; x < 49; ++x) {
      for (y = 1; y < 49; ++y) {
        const pos = new RoomPosition(x, y, this.data.room)
        if (pos.isExit()) {
          costMatrix.set(x, y, 0xff)
          continue
        }
        if (pos.isSteppable() && pos.inFrontOfExit()) {
          costMatrix.set(x, y, 30)
          continue
        }
        if (layout) {
          plannedStruct = layout.getStructureAt(x, y)
          if (plannedStruct === STRUCTURE_ROAD) {
            costMatrix.set(x, y, 2)
          } else if (OBSTACLE_OBJECT_TYPES.indexOf(plannedStruct) > -1) {
            // By making them walkable we allow the road planner to accept positions that are not actually reachable.
            costMatrix.set(x, y, 120)
          }
        }
      }
    }
    /**
     * Ranges and costs for positions near controller and resources can be adjusted to taste in testing,
     * these may not even be needed for just planning roads.
     */
    if (this.room.controller) {
      const poses = this.room.controller.pos.getSteppableAdjacentInRange(2)
      let pos
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 30)
      }
    }
    const sources = this.room.find(FIND_SOURCES)
    let source,
      pos
    for (source of sources) {
      const poses = source.pos.getSteppableAdjacentInRange(1)
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 30)
      }
    }
    const minerals = this.room.find(FIND_MINERALS)
    let mineral
    for (mineral of minerals) {
      const poses = mineral.pos.getSteppableAdjacentInRange(1)
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 30)
      }
    }
    return costMatrix
  }

  /**
   * Return positions with the required amount of room around them. A random result from all possible matches is
   * returned, or if a sort function is provided it will be run *after* a shuffle is applied (so positions with the same
   * sort value will be in different places each run, allowing the same planning pattern to run multiple times with
   * differing results).
   */
  getPositionFor (dt, buffer, sort = false) {
    let positions = []
    let x,
      y
    for (x = 0; x < 50; x++) {
      for (y = 0; y < 50; y++) {
        // gt, not gte, because the DT has a minimum of 1 instead of 0
        if (dt.get(x, y) > buffer) {
          const pos = this.room.getPositionAt(x, y)
          positions.push(pos)
        }
      }
    }

    positions = _.shuffle(positions)
    if (positions.length < 1) {
      return false
    }
    if (sort) {
      positions.sort(sort)
    }
    return positions[0]
  }

  addToMatrix (matrix, center, radius) {
    let xLeft = center.x - radius
    let yTop = center.y - radius

    if (xLeft < 0) {
      xLeft = 0
    }
    if (yTop < 0) {
      yTop = 0
    }

    let xRight = center.x + radius
    let yBottom = center.y + radius
    if (xRight > 49) {
      xRight = 49
    }
    if (yBottom > 49) {
      yBottom = 49
    }

    let x,
      y
    for (x = xLeft; x <= xRight; x++) {
      for (y = yTop; y <= yBottom; y++) {
        matrix.set(x, y, 0)
      }
    }
    return matrix
  }

  getBaseMatrix () {
    const costMatrix = new PathFinder.CostMatrix()
    let x,
      y
    const exits = this.room.find(FIND_EXIT)
    const minimumExitRange = 3
    for (x = 1; x < 49; ++x) {
      for (y = 1; y < 49; ++y) {
        const pos = new RoomPosition(x, y, this.data.room)
        const isNearHorizontalBorder = y < minimumExitRange || y > (49 - minimumExitRange)
        const isNearVerticalBorder = x < minimumExitRange || x > (49 - minimumExitRange)
        if (isNearVerticalBorder || isNearHorizontalBorder) {
          if (pos.findClosestByRange(exits).getRangeTo(pos) < minimumExitRange) {
            continue
          }
        }
        if (pos.getTerrainAt() !== 'wall') {
          costMatrix.set(x, y, 1)
        }
      }
    }
    if (this.room.controller) {
      const poses = this.room.controller.pos.getAdjacentInRange(3)
      let pos
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }
    const sources = this.room.find(FIND_SOURCES)
    let source,
      pos
    for (source of sources) {
      const poses = source.pos.getAdjacentInRange(2)
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }
    const minerals = this.room.find(FIND_MINERALS)
    let mineral
    for (mineral of minerals) {
      const poses = mineral.pos.getAdjacentInRange(2)
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }

    return costMatrix
  }

  displayMatrix (matrix) {
    const visual = new RoomVisual(this.data.room)
    let x,
      y
    for (x = 0; x < 50; ++x) {
      for (y = 0; y < 50; ++y) {
        const value = matrix.get(x, y)
        if (value > 0) {
          let fontsize,
            yOffset
          // vis.circle(x, y, {radius:costMatrix.get(x, y)/max/2, fill:color})
          if (value >= 100) {
            fontsize = '0.5'
            yOffset = 0.19
          } else if (value >= 10) {
            fontsize = '0.7'
            yOffset = 0.22
          } else {
            fontsize = '0.8'
            yOffset = 0.25
          }
          visual.text(value, x - 0.05, +y + yOffset, {
            color: '#000000',
            stroke: '#FFFFFF',
            strokeWidth: 0.05,
            font: fontsize
          })
        }
      }
    }
  }
}

module.exports = CityLayout
