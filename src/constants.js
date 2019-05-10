'use strict'

if (!Memory.username) {
  const struc = _.find(Game.structures)
  const creep = _.find(Game.creeps)
  Memory.username = (struc && struc.owner.username) || (creep && creep.owner.username)
}

global.USERNAME = Memory.username
global.PUBLIC_ACCOUNT = USERNAME === 'Quorum'

global.TICKS_BETWEEN_ALERTS = 3000

global.MAX_INTEL_TARGETS = 50

// How many ticks after a unowned room was signed to sign it again in ticks
global.CONTROLLER_RESIGN_COOLDOWN = 100000

global.PRIORITIES_DEFAULT = 6

global.PRIORITIES_CREEP_DEFAULT = 4
global.PRIORITIES_CREEP_UPGRADER = 6
global.PRIORITIES_FORTIFY = 6
global.PRIORITIES_MINE = 6

global.PRIORITIES_SPAWNS = 3
global.PRIORITIES_DEFENSE = 3

global.PRIORITIES_EMPIRE_INTEL = 4

global.PRIORITIES_CREEP_FACTOTUM = 7
global.PRIORITIES_CREEP_SPOOK = 6
global.PRIORITIES_CREEP_REPLENISHER = 6

global.PRIORITIES_PUBLICWORKS = 7
global.PRIORITIES_EXPAND = 8
global.PRIORITIES_PLAYER = 8
global.PRIORITIES_CITY = 8
global.PRIORITIES_CITY_LABS = 8

global.PRIORITIES_CONSTRUCTION = 9
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

global.MINERAL_INGREDIENTS = {}
const primaryIngredients = Object.keys(REACTIONS)
for (const primaryIngredient of primaryIngredients) {
  const secondaryIngredients = Object.keys(REACTIONS[primaryIngredient])
  for (const secondaryIngredient of secondaryIngredients) {
    const product = REACTIONS[primaryIngredient][secondaryIngredient]
    MINERAL_INGREDIENTS[product] = [primaryIngredient, secondaryIngredient]
  }
}

// Which priorities to monitor.
global.MONITOR_PRIORITIES = _.uniq([
  PRIORITIES_CREEP_DEFAULT,
  PRIORITIES_DEFAULT,
  9
])

global.AGGRESSION_SCORES = {}

global.AGGRESSION_ATTACK = 1
AGGRESSION_SCORES[AGGRESSION_ATTACK] = 1

global.AGGRESSION_HARASS = 2
AGGRESSION_SCORES[AGGRESSION_HARASS] = 5

global.AGGRESSION_STEAL = 3
AGGRESSION_SCORES[AGGRESSION_STEAL] = 5

global.AGGRESSION_RESERVE = 4
AGGRESSION_SCORES[AGGRESSION_RESERVE] = 10

global.AGGRESSION_CLAIM = 5
AGGRESSION_SCORES[AGGRESSION_CLAIM] = 10

global.AGGRESSION_INVADE = 6
AGGRESSION_SCORES[AGGRESSION_INVADE] = 50

global.AGGRESSION_BLOCK_UPGRADE = 7
AGGRESSION_SCORES[AGGRESSION_BLOCK_UPGRADE] = 100

global.AGGRESSION_TRIGGER_SAFEMODE = 8
AGGRESSION_SCORES[AGGRESSION_TRIGGER_SAFEMODE] = 500

global.AGGRESSION_RAZE = 9
AGGRESSION_SCORES[AGGRESSION_RAZE] = 1000

global.TERMINAL_ENERGY = 20000
