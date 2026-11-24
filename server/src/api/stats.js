const { getStats, resetStats } = require('../services/stats')

function getStatsHandler(req, res) {
    res.json(getStats())
}

function resetStatsHandler(req, res) {
    res.json(resetStats())
}

module.exports = {
    getStatsHandler,
    resetStatsHandler,
}
