const core = require('../core')

// Mua vpsk
module.exports = async (driver, gameOptions) => {
    while(true){
        await core.buy8SlotItem(driver)
    }
}