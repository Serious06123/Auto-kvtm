const { getAll, saveAll, resetAll } = require('../services/params')

function getParams(req, res) {
    res.json(getAll())
}

function updateParams(req, res) {
    res.json(saveAll(req.body && req.body.values))
}

function resetParams(req, res) {
    res.json(resetAll())
}

module.exports = { getParams, updateParams, resetParams }
