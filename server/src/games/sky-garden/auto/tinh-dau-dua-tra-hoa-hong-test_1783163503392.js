const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys, BugKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver, 1)
  await core.makeItems(driver, 1, 0, 8, mutex)
  await core.makeItems(driver, 2, 1, 4, mutex)
  await core.goUp(driver, 4)
  await core.makeItems(driver, 1, 3, 8, mutex)
  await core.makeItems(driver, 2, 0, 4, mutex)
  await core.goDownLast(driver)
  await core.goUp(driver, 1)
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 5, false)
  await core.goUp(driver, 4)
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 5, true)
  await core.goDownLast(driver)
  await core.goUp(driver, 1)
  await driver.sleep(1.5)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.plantTrees(driver, mutex, TreeKeys.dua, 4, 5, true)
  await core.goUp(driver, 4)
  await driver.sleep(1.25)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.plantTrees(driver, mutex, TreeKeys.dua, 3, 3, true)
  await core.goDownLast(driver)
  await core.goUp(driver, 1)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.plantTrees(driver, mutex, TreeKeys.hong, 4, 5, false)
  await core.goUp(driver, 4)
  await core.harvestTrees(driver, mutex, 3, 3)
  await core.goDownLast(driver)
  await core.goUp(driver, 1)
  await driver.sleep(2)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.goDownLast(driver)
  if (!isLast) {
    await driver.sleep(0)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false, quantity = 0) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauDua, value: 20 }, { key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
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