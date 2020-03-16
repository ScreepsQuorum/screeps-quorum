'use strict'
const test = require('ava')

require('../../helpers/screeps-globals')

const { createBoundingBoxForRange } = require('../../../src/extends/roomposition')

const BOUND_MIN = 0
const BOUND_MAX = 49

function testMacro (t, x, y, range) {
  const { left, right, top, bottom } = createBoundingBoxForRange(x, y, range)

  t.true(left <= right, 'Left value is less than or equal to right value')
  t.true(top <= bottom, 'Bottom value is less than or equal to top value')

  t.true(BOUND_MIN <= left && left <= BOUND_MAX, 'Left value is out of bound')
  t.true(BOUND_MIN <= right && right <= BOUND_MAX, 'Right value is out of bound')
  t.true(BOUND_MIN <= top && top <= BOUND_MAX, 'Top value is out of bound')
  t.true(BOUND_MIN <= bottom && bottom <= BOUND_MAX, 'Bottom value is out of bound')

  // @todo add some assertions based on range
}

test('Works for x greater than y', testMacro, 20, 10, 10)

test('Works for x less than y', testMacro, 10, 20, 10)

test('Works for x equal to y', testMacro, 10, 10, 10)

test('Works for negative range', testMacro, 10, 10, -10)

test('Works for negative x value', testMacro, -10, 10, 10)

test('Works for negative y value', testMacro, 10, -10, 10)

test('Works for small out of bound x value', testMacro, -100, 10, 10)

test('Works for large out of bound x value', testMacro, 100, 10, 10)

test('Works for small out of bound y value', testMacro, 10, -100, 10)

test('Works for large out of bound y value', testMacro, 10, 100, 10)

test('Works for large range value', testMacro, 10, 10, 100)
