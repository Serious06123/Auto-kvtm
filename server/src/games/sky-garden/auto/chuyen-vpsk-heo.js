const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys, BugKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  if (!isLast) {
    await driver.sleep(0)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false, quantity = 0) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.events, [{ key: EventKeys.heo, value: quantity }], mutex, mutex2, removeItems, false, false)
}

// auto generated
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  const { quantity } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 1; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 0, mutex);
    } 
  }

  if (sell) {
    await sellItems(driver, mutex, mutex2, removeItems, quantity)
  }
}