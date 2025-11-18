// vp.js
const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys } = require('../const');

let slotTree1, slotTree2, count = 0;

const produceItems = async (driver, isLast , mutex) => {
    await core.goUp(driver, 5);
    await core.makeItems(driver, 1, 0, 3 , mutex); // sx tinh dau hoa hong
    await core.goDownLast(driver);
    await core.goUp(driver);
    await core.plantTrees(driver,mutex, slotTree1, 2, 5) // trong tuyet
    await core.goUp(driver, 4)
    await core.plantTrees(driver,mutex, slotTree2, 3, 2) // trong hong
    await core.goDownLast(driver);
    await core.goUp(driver);
    await driver.sleep(1);
    await core.harvestTrees(driver,mutex);
    await core.goUp(driver, 4);
    await core.harvestTrees(driver,mutex);
    await core.goDownLast(driver);
    await core.goUp(driver);

    if (!isLast) {
        await driver.sleep(1);
    }
};


const sellItems = async (driver,mutex , mutex2) => {
    // Sell Goods đúng món ngẫu nhiên
    await core.sellItems(driver, SellItemOptions.goods, [
        { key: ProductKeys.tinhDauHoaHong, value: 20 },
    ],mutex , mutex2);
};



module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  let mutex  = {value : 0} ;
  let mutex2 = {value : 0 };
  for (let i = 0; i < 4; i++) {
    await produceItems(driver, i == 3 , mutex );
  }
  sell && await sellItems(driver,mutex , mutex2);
}
