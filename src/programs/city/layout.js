'use strict'

const distance_transform = require('thirdparty_distancetransform')

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
    STRUCTURE_ROAD,
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
    STRUCTURE_ROAD,
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
    STRUCTURE_ROAD,
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
    STRUCTURE_ROAD,
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
    STRUCTURE_ROAD,
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
    STRUCTURE_ROAD,
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
    STRUCTURE_LAB,
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
    STRUCTURE_LAB,
  ],
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
    null,
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_LINK,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
  ],
  [
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_ROAD,
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
  ],
  [
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,
  ],
  [
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    null,
  ],
]


class CityLayout extends kernel.process {
  getDescriptor() {
    return this.data.room
  }

  main() {
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
      'randomAll',
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
      this.suicide()
    }

    // Actually run layout planning attempt.
    this.data.attempts++
    this[plans[this.data.plan]]()
  }

  /**
   * Try to place the core structures as close to the controller as possible, with the flower structures as close to
   * the core structures as can be managed.
   */
  nearController() {
    let baseMatrix = this.getBaseMatrix()
    let dt = distance_transform.distanceTransform(baseMatrix)

    /* Get core structures */
    const core_position = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER, function(a, b) {
      return a.getRangeTo(Game.rooms[a.roomName].controller) - b.getRangeTo(Game.rooms[b.roomName].controller)
    })
    if (!core_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, core_position, LAYOUT_CORE_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function(a, b) {
      return a.getRangeTo(core_position) - b.getRangeTo(core_position)
    })
    if (!flower1_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1_position, LAYOUT_FLOWER_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)


    /* Get flower2 structures */
    const flower2_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function(a, b) {
      return a.getRangeTo(core_position) - b.getRangeTo(core_position)
    })
    if (!flower2_position) {
      return false
    }

    return this.planLayout(core_position, flower1_position, flower2_position)
  }

  /**
   * Place the core structures anywhere they'll fit, with the flower structures as close to the core structures as can
   * be managed.
   */
  randomCore() {
    let baseMatrix = this.getBaseMatrix()
    let dt = distance_transform.distanceTransform(baseMatrix)

    /* Get core structures */
    const core_position = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER)
    if (!core_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, core_position, LAYOUT_CORE_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function(a, b) {
      return a.getRangeTo(core_position) - b.getRangeTo(core_position)
    })
    if (!flower1_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1_position, LAYOUT_FLOWER_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)


    /* Get flower2 structures */
    const flower2_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER, function(a, b) {
      return a.getRangeTo(core_position) - b.getRangeTo(core_position)
    })
    if (!flower2_position) {
      return false
    }

    return this.planLayout(core_position, flower1_position, flower2_position)
  }

  /**
   * Place core structures and flower structures anywhere they will fit.
   */
  randomAll() {
    let baseMatrix = this.getBaseMatrix()
    let dt = distance_transform.distanceTransform(baseMatrix)

    /* Get core structures */
    const core_position = this.corePos ? this.corePos : this.getPositionFor(dt, LAYOUT_CORE_BUFFER)
    if (!core_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, core_position, LAYOUT_CORE_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)

    /* Get flower1 structures */
    const flower1_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER)
    if (!flower1_position) {
      return false
    }
    baseMatrix = this.addToMatrix(baseMatrix, flower1_position, LAYOUT_FLOWER_BUFFER)
    dt = distance_transform.distanceTransform(baseMatrix)


    /* Get flower2 structures */
    const flower2_position = this.getPositionFor(dt, LAYOUT_FLOWER_BUFFER)
    if (!flower2_position) {
      return false
    }

    return this.planLayout(core_position, flower1_position, flower2_position)
  }

  /**
   * Convert the positions and templates into an actual RoomLayout and save it.
   */
  planLayout(core_pos, flower1_pos, flower2_pos) {
    const layout = Room.getLayout(this.data.room)

    const coreAdjusted = new RoomPosition(core_pos.x - LAYOUT_CORE_BUFFER, core_pos.y - LAYOUT_CORE_BUFFER, this.data.room)
    this.planStructureMatrix(layout, coreAdjusted, LAYOUT_CORE, (2 * LAYOUT_CORE_BUFFER) + 1)

    const flower1Adjusted = new RoomPosition(flower1_pos.x - LAYOUT_FLOWER_BUFFER, flower1_pos.y - LAYOUT_FLOWER_BUFFER, this.data.room)
    this.planStructureMatrix(layout, flower1Adjusted, LAYOUT_FLOWER, (2 * LAYOUT_FLOWER_BUFFER) + 1)

    const flower2Adjusted = new RoomPosition(flower2_pos.x - LAYOUT_FLOWER_BUFFER, flower2_pos.y - LAYOUT_FLOWER_BUFFER, this.data.room)
    this.planStructureMatrix(layout, flower2Adjusted, LAYOUT_FLOWER, (2 * LAYOUT_FLOWER_BUFFER) + 1)

    layout.save()
    Logger.log(`Room planning for room ${this.data.room} has successfully completed`)
    return this.suicide()
  }

  /**
   * Adds a predefined template of structures to a layout starting from the specific position.
   */
  planStructureMatrix(layout, leftCorner, matrix, size = false) {
    if (!size) {
      size = matrix.length
    }
    let row, column
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
        if (structure !== STRUCTURE_ROAD && !OBSTACLE_OBJECT_TYPES[structure]) {
          layout.planStructureAt(STRUCTURE_ROAD, leftCorner.x + column, leftCorner.y + row)
        }
      }
    }
  }


  /**
   * Return positions with the required amount of room around them. A random result from all possible matches is
   * returned, or if a sort function is provided it will be run *after* a shuffle is applied (so positions with the same
   * sort value will be in different places each run, allowing the same planning pattern to run multiple times with
   * differing results).
   */
  getPositionFor(dt, buffer, sort = false) {
    let positions = []
    let x,y
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

  addToMatrix(matrix, center, radius) {
    let x_left = center.x - radius
    let y_top = center.y - radius

    if (x_left < 0) {
      x_left = 0
    }
    if (y_top < 0) {
      y_top = 0
    }

    let x_right = center.x + radius
    let y_bottom = center.y + radius
    if (x_right > 49) {
      x_right = 49
    }
    if (y_bottom > 49) {
      y_bottom = 49
    }

    let x,y
    for (x = x_left; x <= x_right; x++) {
      for (y = y_top; y <= y_bottom; y++) {
        matrix.set(x, y, 0)
      }
    }
    return matrix
  }

  getBaseMatrix() {
    const costMatrix = new PathFinder.CostMatrix()
    let x,y
    for (x = 1; x < 49; ++x) {
      for (y = 1; y < 49; ++y) {
        const pos = new RoomPosition(x, y, this.data.room)
        if (pos.inFrontOfExit()) {
          continue
        }
        if (pos.getTerrainAt() !== 'wall') {
          costMatrix.set(x, y, 1)
        }
      }
    }
    if (!!this.room.controller) {
      const poses = this.room.controller.pos.getAdjacent()
      let pos
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }
    const sources = this.room.find(FIND_SOURCES)
    let source, pos
    for (source of sources) {
      const poses = source.pos.getAdjacent()
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }
    const minerals = this.room.find(FIND_MINERALS)
    let mineral
    for (mineral of minerals) {
      const poses = mineral.pos.getAdjacent()
      for (pos of poses) {
        costMatrix.set(pos.x, pos.y, 0)
      }
    }

    return costMatrix
  }

  displayMatrix(matrix) {
    const visual = new RoomVisual(this.data.room)
    let x, y
    for (x = 0; x < 50; ++x) {
      for (y = 0; y < 50; ++y) {
        const value = matrix.get(x, y)
        if (value > 0) {
          let fontsize,
            y_offset
          // vis.circle(x, y, {radius:costMatrix.get(x, y)/max/2, fill:color})
          if (value >= 100) {
            fontsize = '0.5'
            y_offset = 0.19
          } else if (value >= 10) {
            fontsize = '0.7'
            y_offset = 0.22
          } else {
            fontsize = '0.8'
            y_offset = 0.25
          }
          visual.text(value, x - 0.05, +y + y_offset, {
            color: '#000000',
            stroke: '#FFFFFF',
            strokeWidth: 0.05,
            font: fontsize,
          })
        }
      }
    }
  }
}

module.exports = CityLayout
