
const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys } = require('../const')

const produceItems = async (driver, isLast , mutex) => {
    // trong bong, chanh
    await core.goUp(driver)
    await core.makeItems(driver, 1, 2, 8 , mutex) // sx oai huong say
    await core.goUp(driver, 2)
    await core.makeItems(driver, 1, 2, 8 , mutex) // sx vai tim
    await core.goUp(driver, 2)
    await core.makeItems(driver, 1, 3, 8 , mutex) // sx tinh dau dua    
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.plantTrees(driver,mutex, TreeKeys.tuyet, 4, 5, false) // trong tuyet
    await core.goUp(driver, 4)
    await core.plantTrees(driver,mutex, TreeKeys.tuyet, 2, 1) // trong tuyet
    await core.goUp(driver, 2)
    await core.plantTrees(driver,mutex, TreeKeys.bong, 4, 5, false) // trong bong
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.harvestTrees(driver, mutex, 4, 5)
    await core.plantTrees(driver,mutex, TreeKeys.dua, 4, 5) // trong dua
    await core.goUp(driver, 4)
    await core.harvestTrees(driver , mutex)
    await core.plantTrees(driver,mutex, TreeKeys.dua, 3, 3) // trong dua
    await core.goUp(driver, 4)
    await core.harvestTrees(driver,mutex, 2, 5)
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.harvestTrees(driver , mutex)
    await core.plantTrees(driver,mutex, TreeKeys.oaiHuong, 4, 5, false) // trong oai huong
    await core.goUp(driver, 4)
    await core.harvestTrees(driver,mutex, 3, 3)
    await core.goDownLast(driver)
    await core.goUp(driver)
    await core.harvestTrees(driver,mutex)
    await core.goDownLast(driver)
    if (!isLast) {
        await driver.sleep(1)
    }
}

const sellItems = async (driver,mutex , mutex2) => {
    // Sell Goods
    await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.vaiTim, value: 20 }] , mutex , mutex2)
    await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.tinhDauDua, value: 20 }] , mutex , mutex2)
}

// vai xanh la
module.exports = async (driver, gameOptions) => {
  const { sellItems: sell } = gameOptions;
  let mutex  = {value : 0} ;
  let mutex2 = {value : 0 };
  for (let i = 0; i < 3; i++) {
    await produceItems(driver, i == 2 , mutex );
  }
  sell && await sellItems(driver,mutex , mutex2);
}