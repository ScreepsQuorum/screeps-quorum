
const creeps = Object.keys(Game.creeps)
if (creeps.length > 0) {
  global.USERNAME = Game.creeps[creeps[0]].owner.username
} else {
  const structures = Object.keys(Game.structures)
  if (structures.length > 0) {
    global.USERNAME = Game.structures[structures[0]].owner.username
  } else {
    global.USERNAME = false
  }
}

global.PRIORITIES_DEFAULT = 6

global.PRIORITIES_CREEP_DEFAULT = 4
global.PRIORITIES_CREEP_UPGRADER = 6

global.PRIORITIES_SPAWNS = 3
global.PRIORITIES_DEFENSE = 3

global.PRIORITIES_EMPIRE_INTEL = 4
global.PRIORITIES_CITY = 7

global.PRIORITIES_CONSTRUCTION = 8
global.PRIORITIES_PLAYER = 8

global.PRIORITIES_CITY_REBOOT = 9
global.PRIORITIES_EMPIRE_MARKET = 10
global.PRIORITIES_RESPAWNER = 12

// how often it gets recorded.
global.MARKET_STATS_INTERVAL = 750
// Interval * Max Records == length of history saved
global.MARKET_STATS_MAXECORD = 50
// Percentage of records to drop. This prevents outliers from skewing results.
global.MARKET_STATS_DROP = 0.10
