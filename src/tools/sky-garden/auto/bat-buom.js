const core = require('../core')
const { BugKeys } = require('../const')

module.exports = async (driver, gameOptions) => {
    await core.findbugonfloor(driver , BugKeys.buom);
}