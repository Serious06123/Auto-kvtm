const core = require('../core')
const { EventKeys } = require('../const')

// Chuyen heo
module.exports = async (driver, gameOptions) => {
    const {quantity} = gameOptions
    await core.sellEventItems(driver, EventKeys.cuu, quantity, true)
}