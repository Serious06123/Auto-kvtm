const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys, BugKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
  await core.findbugonfloor(driver, [{ key: BugKeys.chuonchuon, value: 5 }, { key: BugKeys.buom, value: 5 }, { key: BugKeys.ong, value: 5 }])
  if (!isLast) {
    await driver.sleep(0)
  }
}

// auto generated
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  const { removeItems: removeItems } = gameOptions;
  const { quantity } = gameOptions;
  let mutex = { value: 0 };
  let mutex2 = { value: 0 };
  for (let i = 0; i < 10; i++) {
    if (mutex.value != 1) {
      await produceItems(driver, i == 9, mutex);
    } 
  }

}