'use strict'

/**
 * The Genome class allows for infinite but replicatable variations on bot behavior.
 *
 * This library can be used to add "personality" to bots. An instance of Genome takes a string (such as the bot name) as
 * a constructor argument which feeds into a Lehmer RNG (thus giving it repeatable results). The `trait` function uses
 * this to return `phenotype` data, which is representated as an integer and can be restricted to specific ranges.
 * Traits are weighted towards the center of the range (a range of 0-9 will have a 66.82% change of being 4, 5, or 6 and
 * a less than 10% chance of getting 1, 2, 8 or 9. This makes extreme traits less likely to occur (but still possible).
 * Each trait also takes an `expected` value which will *always* be returned if the bot is named `Quorum`.
 *
 * @example
 * let myGenome = new Genome('Bob')
 * // Default result of five (for Quorum), returns anywhere between 1 and 9 weighted for 5.
 * // Multiple runs of `trait` with the same `seed` will return the same result.
 * // * 0.64% chance of 1
 * // * 4.29% chance of 2
 * // * 11.66% chance of 3
 * // * 21.01% chance of 4
 * // * 24.72% chance of 5
 * // * 21.05% chance of 6
 * // * 11.66% chance of 7
 * // * 4.32% chance of 8
 * // * 0.65% chance of 9
 * myGenome.trait('aggression', 5, {range: 4})
 * myGenome.trait('aggression', 5, {min: 1, max: 9})
 */
class Genome {
  constructor (initializer, returnExpected = false) {
    // defined for convenience, do not change without also changing Lehmer multiplier in `_getNumberFromSeed`
    this.max = 2147483647
    this.seed = this._getNumberFromString(initializer)
    this.returnDefault = returnExpected
  }

  trait (name, expected, opts) {
    if (this.returnDefault) {
      return expected
    }
    if (typeof opts.centering === 'undefined') {
      opts.centering = 3
    }
    let max = expected
    let min = 0
    if (opts.range) {
      max = expected + opts.range
      min = expected - opts.range
    }
    if (opts.max) {
      max = opts.max
    }
    if (opts.min) {
      min = opts.min
    }
    if (opts.centering) {
      return this.randomCenterWeightedInt(name, min, max, opts.centering)
    } else {
      return this.randomInt(name, min, max)
    }
  }

  random (label) {
    const seed = (this._getNumberFromString(label) + this.seed) % this.max
    return this._getNumberFromSeed(seed) / (this.max - 1)
  }

  randomInt (label, min, max) {
    return Math.floor(this.random(label) * (max - min + 1) + min)
  }

  randomCenterWeighted (label, iterations = 3) {
    // const iterations = 3
    let total = this._getNumberFromSeed((this._getNumberFromString(label) + this.seed) % this.max)
    for (let i = 1; i < iterations; i++) {
      total += this._getNumberFromSeed(total)
    }
    return (total / iterations) / (this.max - 1)
  }

  randomCenterWeightedInt (label, min, max, iterations = 3) {
    return Math.floor(this.randomCenterWeighted(label, iterations) * (max - min + 1) + min)
  }

  _getNumberFromString (string) {
    let numeric = 1
    for (var i = 0; i < string.length; i++) {
      numeric = this._getNumberFromSeed((numeric * string.charCodeAt(i) % 65535) + 1)
    }
    return numeric
  }

  _getNumberFromSeed (seed) {
    // Lehmer random number generator
    return (seed * 48271) % this.max
  }
}

// This is a simple command line tool called via node which outputs a table showing the distribution of results with
// a variety of different "centering" values. To set the max value simply add an additional argument when calling.
if (typeof module !== 'undefined' && !module.parent) {
  const iterations = 1000000
  const max = process.argv.length >= 3 ? process.argv[2] : 10
  const modifier = Math.floor(Math.random() * (100 + 1))
  const seed = 'Quorum' + modifier
  console.log(`Testing distribution with seed ${seed} over ${iterations} iterations with max value ${max}.`)
  const genome = new Genome(seed)

  const count = {}
  for (let i = 0; i < iterations; i++) {
    const ret = genome.randomInt('apples' + i, 1, max)
    if (!count[ret]) {
      count[ret] = 1
    } else {
      count[ret]++
    }
  }

  const trait = {}
  for (let i = 0; i < iterations; i++) {
    const ret = genome.trait('apples' + i, 50, {
      max: max,
      min: 1
    })
    if (!trait[ret]) {
      trait[ret] = 1
    } else {
      trait[ret]++
    }
  }

  const weights = [1, 2, 3, 5, 10, 50]
  const weightedResults = {}
  for (const weight of weights) {
    weightedResults[weight] = {}
    for (let i = 0; i < iterations; i++) {
      const ret = genome.randomCenterWeightedInt('apples' + i, 1, max, weight)
      if (!weightedResults[weight][ret]) {
        weightedResults[weight][ret] = 1
      } else {
        weightedResults[weight][ret]++
      }
    }
  }

  const normalizeCount = function (num) {
    if (!num) {
      return 0
    }
    return (((num / iterations) * 100).toFixed(2)) + '%'
  }

  let header = 'Value'
  header += '\tUnweighted'
  header += '\tTrait'

  for (const weight of weights) {
    header += `\t\t${weight}`
  }
  console.log(header)

  for (let i = 1; i <= max; i++) {
    let message = `${i}`
    message += `\t${normalizeCount(count[i])}`
    message += `\t\t${normalizeCount(trait[i])}`

    for (const weight of weights) {
      message += `\t\t${normalizeCount(weightedResults[weight][i])}`
    }

    console.log(message)
  }
} else {
  // Use the botname as the seed.
  const botname = global.USERNAME ? global.USERNAME : 'Quorum'
  module.exports = new Genome(botname, PUBLIC_ACCOUNT)
}
