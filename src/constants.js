'use strict'

if (!Memory.username) {
  const struc = _.find(Game.structures)
  const creep = _.find(Game.creeps)
  Memory.username = (struc ? struc.owner.username : false) || (creep ? creep.owner.username : false)
}

global.USERNAME = Memory.username
global.PUBLIC_ACCOUNT = USERNAME === 'Quorum'

global.MAX_INTEL_TARGETS = 500

global.PRIORITIES_DEFAULT = 6

global.PRIORITIES_CREEP_DEFAULT = 4
global.PRIORITIES_CREEP_UPGRADER = 6
global.PRIORITIES_FORTIFY = 6

global.PRIORITIES_SPAWNS = 3
global.PRIORITIES_DEFENSE = 3

global.PRIORITIES_EMPIRE_INTEL = 4
global.PRIORITIES_CITY = 7

global.PRIORITIES_EXPAND = 8
global.PRIORITIES_CONSTRUCTION = 8
global.PRIORITIES_PLAYER = 8

global.PRIORITIES_CITY_REBOOT = 9
global.PRIORITIES_EMPIRE_MARKET = 10
global.PRIORITIES_RESPAWNER = 12
global.PRIORITIES_MAINTENANCE = 12

// how often it gets recorded.
global.MARKET_STATS_INTERVAL = 750
// Interval * Max Records == length of history saved
global.MARKET_STATS_MAXECORD = 50
// Percentage of records to drop. This prevents outliers from skewing results.
global.MARKET_STATS_DROP = 0.10

global.MINERALS_EXTRACTABLE = [
  RESOURCE_HYDROGEN,
  RESOURCE_OXYGEN,
  RESOURCE_UTRIUM,
  RESOURCE_LEMERGIUM,
  RESOURCE_KEANIUM,
  RESOURCE_ZYNTHIUM,
  RESOURCE_CATALYST
]

// Which priorities to monitor.
global.MONITOR_PRIORITIES = _.uniq([
  PRIORITIES_CREEP_DEFAULT,
  PRIORITIES_DEFAULT
])
