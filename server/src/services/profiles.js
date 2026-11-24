const { resolve } = require('path')
const { readJsonSafe, writeJsonAtomic } = require('./data')
const { isValidDeviceId } = require('../engine/adb')

const getProfilesFile = () =>
    process.env.PROFILES_FILE
        ? resolve(process.env.PROFILES_FILE)
        : resolve(__dirname, '../../../data/profiles.json')

const normalizeSpeedOverride = (val) => {
    if (val === undefined || val === null || val === '') return null
    const n = Number(val)
    if (isNaN(n) || n < 1) return null
    return Math.min(3, Math.round(n * 100) / 100)
}

function getProfiles() {
    const list = readJsonSafe(getProfilesFile(), [])
    return Array.isArray(list) ? list : []
}

function saveProfile(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid profile payload')
    }
    const name = String(payload.name || '').trim()
    if (!name) {
        throw new Error('Profile name is required')
    }
    const selectedGame = String(payload.selectedGame || '').trim()
    if (!selectedGame) {
        throw new Error('selectedGame is required')
    }

    const deviceIds = Array.isArray(payload.deviceIds)
        ? Array.from(new Set(payload.deviceIds.filter((d) => isValidDeviceId(d))))
        : []

    const gameOptions =
        payload.gameOptions && typeof payload.gameOptions === 'object'
            ? { ...payload.gameOptions }
            : {}

    const speedMultiplierOverride = normalizeSpeedOverride(
        payload.speedMultiplierOverride !== undefined
            ? payload.speedMultiplierOverride
            : gameOptions.speedMultiplierOverride
    )
    if (speedMultiplierOverride !== null) {
        gameOptions.speedMultiplierOverride = speedMultiplierOverride
    } else {
        delete gameOptions.speedMultiplierOverride
    }

    const profiles = getProfiles()
    const id = payload.id ? String(payload.id).trim() : null
    const now = new Date().toISOString()

    let existingIdx = id ? profiles.findIndex((p) => p.id === id) : -1
    if (existingIdx === -1) {
        existingIdx = profiles.findIndex(
            (p) => p.name.toLowerCase() === name.toLowerCase() && p.selectedGame === selectedGame
        )
    }

    let profile
    if (existingIdx !== -1) {
        profile = {
            ...profiles[existingIdx],
            name,
            selectedGame,
            selectedAuto: String(payload.selectedAuto || gameOptions.runAuto || ''),
            deviceIds,
            gameOptions,
            speedMultiplierOverride,
            updatedAt: now,
        }
        profiles[existingIdx] = profile
    } else {
        profile = {
            id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name,
            selectedGame,
            selectedAuto: String(payload.selectedAuto || gameOptions.runAuto || ''),
            deviceIds,
            gameOptions,
            speedMultiplierOverride,
            createdAt: now,
            updatedAt: now,
        }
        profiles.push(profile)
    }

    writeJsonAtomic(getProfilesFile(), profiles, true)
    return { profile, profiles }
}

function deleteProfile(id) {
    const cleanId = String(id || '').trim()
    if (!cleanId) {
        throw new Error('Profile id is required')
    }
    const profiles = getProfiles().filter((p) => p.id !== cleanId)
    writeJsonAtomic(getProfilesFile(), profiles, true)
    return profiles
}

module.exports = {
    getProfiles,
    saveProfile,
    deleteProfile,
}
