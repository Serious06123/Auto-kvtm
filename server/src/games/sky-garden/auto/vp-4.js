// vp.js
const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver, 5);
  await core.makeItems(driver, 1, 0, 3, mutex); // sx tinh dau hoa hong
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  await core.plantTrees(driver, mutex, TreeKeys.tuyet, 2, 5) // trong tuyet
  await core.goUp(driver, 4)
  await core.plantTrees(driver, mutex, TreeKeys.hong, 3, 2) // trong hong
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  await driver.sleep(1);
  await core.harvestTrees(driver, mutex, 4, 5);
  await core.goUp(driver, 4);
  await core.harvestTrees(driver, mutex, 4, 5);
  await core.goDownLast(driver);
  await core.goUp(driver, 1);
  if (!isLast) {
    await driver.sleep(1);
  }
};


const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
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