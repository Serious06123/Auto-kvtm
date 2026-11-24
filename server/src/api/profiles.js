const { getProfiles, saveProfile, deleteProfile } = require('../services/profiles')

function getProfilesHandler(req, res) {
    res.json(getProfiles())
}

function saveProfileHandler(req, res) {
    try {
        const result = saveProfile(req.body)
        res.json(result)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

function deleteProfileHandler(req, res) {
    try {
        const profiles = deleteProfile(req.params.id)
        res.json({ success: true, profiles })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

module.exports = {
    getProfilesHandler,
    saveProfileHandler,
    deleteProfileHandler,
}
