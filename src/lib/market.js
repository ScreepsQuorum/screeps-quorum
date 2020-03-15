'use strict'

module.exports.getAveragePrice = function (resource, orderType) {
  return sos.lib.stats.rollingAverage(`${resource}_${orderType}`, {
    interval: MARKET_STATS_INTERVAL,
    maxrecord: MARKET_STATS_MAXECORD,
    drop: MARKET_STATS_DROP,
    callback: function () {
      return module.exports.getCurrentPrice(resource, orderType)
    }
  })
}

module.exports.getOrdersByType = function (resource, orderType) {
  // Temporary wrapper to deal with broken data in game engine (bug reported to devs)
  try {
    return Game.market.getAllOrders({ type: orderType, resourceType: resource })
  } catch (err) {
    return []
  }
}

module.exports.getCurrentPrice = function (resource, orderType) {
  const orders = module.exports.getOrdersByType(resource, orderType)
  if (orderType === ORDER_BUY) {
    orders.sort((a, b) => a.price - b.price)
  } else {
    orders.sort((a, b) => b.price - a.price)
  }

  if (orders.length < 1) {
    return false
  }

  let price = false

  // Filter out the first few orders (by quantity) to prevent manipulation or confusion over phantom orders.
  let amount = 0
  for (const order of orders) {
    // Skip all new orders - manipulation orders tend to get bought out really quick.
    if (Game.time - order.created < 20) {
      continue
    }
    amount += order.amount
    if (amount > 1000) {
      price = order.price
      break
    }
  }
  return price
}

module.exports.sellImmediately = function (resource, room, quantity) {
  return module.exports.transactImmediately(resource, room, quantity, ORDER_BUY)
}

module.exports.buyImmediately = function (resource, room, quantity) {
  return module.exports.transactImmediately(resource, room, quantity, ORDER_SELL)
}

module.exports.transactImmediately = function (resource, room, quantity, orderType) {
  if (!room.name) {
    if (Game.rooms[room]) {
      room = Game.rooms[room]
    } else {
      return ERR_INVALID_TARGET
    }
  }
  if (!room.terminal) {
    return ERR_INVALID_TARGET
  }
  if (room.terminal.cooldown) {
    return ERR_BUSY
  }
  const orders = module.exports.getOrdersByType(resource, orderType)
  if (orderType === ORDER_SELL) {
    orders.sort((a, b) => a.price - b.price)
  } else {
    orders.sort((a, b) => b.price - a.price)
  }
  for (const order of orders) {
    if (order.amount > TERMINAL_MIN_SEND) {
      if (order.amount < quantity) {
        quantity = order.amount
      }
      if (quantity > room.terminal.store[RESOURCE_ENERGY]) {
        quantity = room.terminal.store[RESOURCE_ENERGY]
      }
      return Game.market.deal(order.id, quantity, room.name)
    }
  }
  return ERR_NOT_FOUND
}

module.exports.getHighestMineralValue = function (mineral) {
  if (!this.highestValueMineral) {
    this.highestValueMineral = Math.max(
      module.exports.getAveragePrice(RESOURCE_CATALYST, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_OXYGEN, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_HYDROGEN, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_UTRIUM, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_LEMERGIUM, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_ZYNTHIUM, ORDER_SELL),
      module.exports.getAveragePrice(RESOURCE_KEANIUM, ORDER_SELL)
    )
  }
  return this.highestValueMineral
}
