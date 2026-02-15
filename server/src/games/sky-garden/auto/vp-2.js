const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver, 1)
  await core.makeItems(driver, 1, 0, 6, mutex);
  await core.makeItems(driver, 2, 1, 3, mutex);
  await core.goUp(driver, 4);
  await core.makeItems(driver, 1, 0, 3, mutex);
  await core.makeItems(driver, 2, 0, 3, mutex);
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 4, 5, false);
  await core.goUp(driver, 4);
  await core.plantTrees(driver, mutex, TreeKeys.hong, 4, 5);
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  await driver.sleep(1.25);
  await core.harvestTrees(driver, mutex, 4, 5);
  await core.goUp(driver, 4);
  await core.harvestTrees(driver, mutex, 4, 5);
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  await core.plantTrees(driver, mutex, TreeKeys.hong, 2, 2);
  await driver.sleep(9);
  await core.harvestTrees(driver, mutex, 2, 2);
  await core.goDownLast(driver);
  if (!isLast) {
    await driver.sleep(0.1);
  }
};

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
}

module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
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