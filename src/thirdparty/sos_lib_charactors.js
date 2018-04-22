'use strict'

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTYVWXYZ'
const numbers = '0123456789'
const symbols = '-_=+/?>,<[]{}\\|!@#$%^&*()_+:'

module.exports.alpha = alpha
module.exports.numbers = numbers
module.exports.symbols = symbols
module.exports.alphanum = alpha + numbers
module.exports.all = alpha + numbers + symbols
