const core = require('../core')

module.exports = async (driver, gameOptions) => {
    await core.readNumberArray(driver);
}