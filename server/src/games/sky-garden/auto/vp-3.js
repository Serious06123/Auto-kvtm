// vp.js
const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.goUp(driver)
  await core.makeItems(driver, 1, 2, 8, mutex) // sx oai huong say
  await core.goUp(driver, 2)
  await core.makeItems(driver, 1, 8, 6, mutex) // sx vai tim
  await core.goDownLast(driver);
  await core.goUp(driver);
  await core.plantTrees(driver, mutex, TreeKeys.oaiHuong, 4, 5); // trong tuyet
  await driver.sleep(9)
  await core.harvestTrees(driver, mutex);
  await core.plantTrees(driver, mutex, TreeKeys.bong, 4, 5); // trong hong
  await driver.sleep(9)
  await core.harvestTrees(driver, mutex);
  await core.goDownLast(driver);
  if (!isLast) {
    await driver.sleep(14);
  }
};

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  // Sell Goods đúng món
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.nuocHoaHoaHong, value: 20 }], mutex, mutex2, removeItems, true)
};

module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 6; i++) {
    await produceItems(driver, i == 5, mutex);
  }
  sell && await sellItems(driver, mutex, mutex2);
}