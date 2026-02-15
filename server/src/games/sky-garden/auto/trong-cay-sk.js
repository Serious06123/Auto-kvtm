const core = require('../core')
const { SellItemOptions, ProductKeys, TreeKeys, ProductTreeKeys, ProductMineralKeys, OtherKeys, EventKeys } = require('../const')

const produceItems = async (driver, isLast, mutex) => {
    await core.goDownLast(driver)
    await core.goUp(driver, 1)
    await core.plantTrees(driver, mutex, TreeKeys.caysao, 4, 5, false, true) // trong tuyet
    await core.goUp(driver, 4)
    await core.plantTrees(driver, mutex, TreeKeys.caysao, 4, 5, false, true) // trong hong
    await core.goDownLast(driver)
    await core.goUp(driver, 1)
    await driver.sleep(5)
    await core.harvestTrees(driver, mutex, 4, 5, true)
    await core.goUp(driver, 4)
    await core.harvestTrees(driver, mutex, 4, 5, true)
}



// tinh hoa hong
module.exports = async (driver, gameOptions) => {
    let mutex = { value: 0 };
    for (let i = 0; i < 99; i++) {
        if (mutex.value != 1) {
            await produceItems(driver, i == 98, mutex);
        }
    }

}