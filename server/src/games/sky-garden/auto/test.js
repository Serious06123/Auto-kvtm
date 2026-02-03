const core = require('../core');
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.readNumberArray(driver);
  if (!isLast) {
    await driver.sleep(8)
  }
}

const sellItems = async (driver, mutex, mutex2, removeItems = false) => {
  // Sell Goods
  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems)
}

// auto generated
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 1; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 0, mutex);
    }
  }

  if (sell) {
    await sellItems(driver, mutex, mutex2, removeItems)
  }
}
