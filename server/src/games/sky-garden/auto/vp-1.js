const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver, 1)
  await core.makeItems(driver, 1, 0, 6, mutex) // sx hoa hong say
  await core.makeItems(driver, 2, 1, 3, mutex) // sx nuoc tuyet
  await core.goUp(driver, 4)
  await core.makeItems(driver, 2, 0, 3, mutex) // sx tra hoa hong
  await core.goDownLast(driver)
  await core.goUp(driver, 1)
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 2, 5) // trong tuyet
  await driver.sleep(9);
  await core.harvestTrees(driver, mutex, 2, 5)
  await core.plantTrees(driver, mutex, TreeKeys.hong, 3, 5) // trong hong
  await driver.sleep(9);
  await core.harvestTrees(driver, mutex, 3, 5)
  await core.goDownLast(driver)
  if (!isLast) {
    await driver.sleep(9)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
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
    await sellItems(driver, mutex, mutex2, removeItems)
  }
}