const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys , ProductTreeKeys, ProductMineralKeys ,OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  if (!isLast) {
    await driver.sleep(0)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false, quantity = 0) => {
  // Sell Goods
  await core.sellEventItems(driver, EventKeys.cuu, quantity, false)
}

// auto generated
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  const { quantity } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 5; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 4, mutex);
    } 
  }

  if (sell) {
    await sellItems(driver, mutex, mutex2, removeItems, quantity)
  }
}