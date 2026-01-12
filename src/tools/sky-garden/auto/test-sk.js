const core = require('../core')

module.exports = async (driver, gameOptions) => {
    await core.makeEvents(driver);
}