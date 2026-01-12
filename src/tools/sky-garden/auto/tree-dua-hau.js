const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys } = require('../const')
const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver)
  await core.plantTrees(driver, mutex, TreeKeys.duaHau, 4, 5) 
  await core.goUp(driver,4)
  await core.plantTrees(driver, mutex, TreeKeys.duaHau, 4, 5) 
  await core.goDownLast(driver)
  await core.goUp(driver)
  await driver.sleep(1.5)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.goUp(driver,4)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.goDownLast(driver)
  if (!isLast) {
    await driver.sleep(0.1)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  await core.sellItems(driver, SellItemOptions.tree, [{ key: ProductKeys.duaHau, value: 48 }], mutex, mutex2 , removeItems , true)
}


module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 10; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 9, mutex);
    } 
  }
  if (sell) {
    await sellItems(driver, mutex, mutex2, removeItems)
  }
}