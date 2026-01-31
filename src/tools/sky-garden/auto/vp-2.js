// vp.js
const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys } = require('../const');

//let slotTree1, slotTree2, count = 0;

const produceItems = async (driver, isLast , mutex  ) => {
  await core.goUp(driver)
  await core.makeItems(driver, 1, 0, 6 , mutex); // sx hoa hong say
  await core.makeItems(driver, 2, 1, 3 , mutex); // sx nuoc tuyet
  await core.goUp(driver, 4);
  await core.makeItems(driver, 1, 0, 3 ,  mutex); // sx tinh dau hoa hong
  await core.makeItems(driver, 2, 0, 3 ,  mutex); // sx tra hoa hong
  await core.goDownLast(driver);
  await core.goUp(driver);
  await core.plantTrees(driver,mutex,TreeKeys.tuyet, 4, 5, false); // trong tuyet
  await core.goUp(driver, 4);
  await core.plantTrees(driver,mutex ,TreeKeys.hong, 4, 5); // trong hong
  await core.goDownLast(driver);
  await core.goUp(driver);
  await driver.sleep(1.25);
  await core.harvestTrees(driver, mutex);
  await core.goUp(driver, 4);
  await core.harvestTrees(driver , mutex);
  await core.goDownLast(driver);
  await core.goUp(driver);
  await core.plantTrees(driver,mutex, TreeKeys.hong, 2, 2); // trong hong
  await driver.sleep(9);
  await core.harvestTrees(driver, mutex, 2, 2);
  await core.goDownLast(driver);
  if (!isLast) {
    await driver.sleep(0.1);
  }
};

// Sell Goods đúng món ngẫu nhiên
const sellItems = async (driver , mutex , mutex2 , removeItems = false) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex ,mutex2 , removeItems)
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauHoaHong, value: 20 }],mutex ,mutex2 , removeItems)
}
// tinh hoa hong
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