const path = require('path')
const { readJsonSafe } = require('../services/data')
const { getFeedbackStatus, submitFeedback } = require('../services/feedback')

const getFaqFilePath = () =>
    process.env.FAQ_FILE
        ? path.resolve(process.env.FAQ_FILE)
        : path.resolve(__dirname, '../../../data/faq.json')

function getFaqHandler(req, res) {
    const list = readJsonSafe(getFaqFilePath(), [])
    res.json(Array.isArray(list) ? list : [])
}

function getFeedbackStatusHandler(req, res) {
    res.json(getFeedbackStatus())
}

async function submitFeedbackHandler(req, res) {
    try {
        const result = await submitFeedback(req.body)
        if (!result.ok) {
            return res.status(result.statusCode || 500).json(result)
        }
        return res.json(result)
    } catch (err) {
        const status = err.statusCode || 400
        return res.status(status).json({
            ok: false,
            code: err.code || 'VALIDATION_ERROR',
            error: err.message,
        })
    }
}

module.exports = {
    getFaqHandler,
    getFeedbackStatusHandler,
    submitFeedbackHandler,
}
