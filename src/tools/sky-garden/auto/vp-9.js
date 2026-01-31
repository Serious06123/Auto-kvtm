
const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
    await core.goUp(driver)
    await core.makeItems(driver, 1, 0, 6, mutex) // sx hoa hong say
    await core.makeItems(driver, 2, 1, 3, mutex) // sx nuoc tuyet
    await core.goUp(driver, 4)
    await core.makeItems(driver, 1, 3, 8, mutex) // sx tinh dầu dừa
    await core.makeItems(driver, 2, 0, 3 , mutex) // sx tra hoa hong
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 5, false) // trong tuyet
    await core.goUp(driver, 4)
    await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 1) // trong tuyet
    await core.goDownLast(driver)
    await core.goUp(driver)
    await driver.sleep(1.5)
    await core.harvestTrees(driver, mutex, 4, 5)
    await core.plantTrees(driver, mutex, TreeKeys.dua, 4, 5) // trong dua
    await core.goUp(driver, 4)
    await driver.sleep(1.25);
    await core.harvestTrees(driver, mutex, 4, 1)
    await core.plantTrees(driver, mutex, TreeKeys.dua, 3, 3) // trong dua
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.harvestTrees(driver, mutex)
    await core.plantTrees(driver, mutex, TreeKeys.hong, 3, 5, false) // trong hong
    await core.goUp(driver, 4)
    await core.harvestTrees(driver, mutex, 3, 3)
    await core.goDownLast(driver)
    await core.goUp(driver)
    await driver.sleep(2)
    await core.harvestTrees(driver, mutex, 3, 5)
    await core.goDownLast(driver)
    if (!isLast) {
        await driver.sleep(3)
    }
}

const sellItems = async (driver, mutex, mutex2 , removeItems = false) => {
    // Sell Goods
    await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauDua, value: 20 }], mutex, mutex2 , removeItems)
    await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2 , removeItems)
}

// vai xanh la
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

  sell && await sellItems(driver, mutex, mutex2, removeItems);
}