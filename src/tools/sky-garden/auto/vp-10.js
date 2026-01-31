
const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver)
  await core.makeItems(driver, 1, 0, 6, mutex) // sx hong say
  await core.makeItems(driver, 2, 1, 6, mutex) // sx nuoc tuyet
  await core.goUp(driver, 2)
  await core.makeItems(driver, 1, 0, 6, mutex) // sx vai do
  await core.goDownLast(driver)
  await core.goUp(driver)
  // thu hoach 1
  await core.plantTrees(driver, mutex, TreeKeys.hong, 3, 5)
  await driver.sleep(9)
  await core.harvestTrees(driver, mutex, 3, 5)
  await core.plantTrees(driver, mutex, TreeKeys.bong, 3, 5)
  await driver.sleep(9)
  await core.harvestTrees(driver, mutex, 3, 5)
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 5, false)
  await driver.sleep(9)
  await core.harvestTrees(driver, mutex, 4, 5)
  await core.goDownLast(driver)
  // thu hoach 2
  if (!isLast) {
    await driver.sleep(1);
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  // Sell Goods

  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.nuocTuyet, value: 20 }], mutex, mutex2, removeItems)
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.vaiDo, value: 20 }], mutex, mutex2, removeItems)
}


// vai do
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 4; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 3, mutex);
    }
  }

  if (sell) {
    await sellItems(driver, mutex, mutex2, removeItems)
  }
}