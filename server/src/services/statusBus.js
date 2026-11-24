const { EventEmitter } = require('events')

class StatusBus extends EventEmitter {
    constructor() {
        super()
        this.setMaxListeners(50)
        this.statusMap = new Map()
    }

    updateStatus(deviceId, patch = {}) {
        if (!deviceId) return null
        const prev = this.statusMap.get(deviceId) || {
            deviceId,
            state: 'running',
            currentStep: '',
            loopIndex: 0,
            frequency: 0,
            startedAt: Date.now(),
            lastActivityAt: Date.now(),
            recoveryCount: 0,
            consecutiveErrors: 0,
            isPaused: false,
            stopAfterLoop: false,
        }
        const next = {
            ...prev,
            ...patch,
            deviceId,
            lastActivityAt: patch.lastActivityAt !== undefined ? patch.lastActivityAt : Date.now(),
        }
        this.statusMap.set(deviceId, next)
        this.emit('status', { ...next })
        return next
    }

    appendLog(deviceId, line) {
        if (!deviceId || !line) return
        this.emit('log', {
            deviceId,
            line: String(line),
            timestamp: Date.now(),
        })
    }

    removeStatus(deviceId) {
        if (!deviceId) return
        const existed = this.statusMap.delete(deviceId)
        if (existed) {
            this.emit('removed', { deviceId })
        }
    }

    getStatus(deviceId) {
        return this.statusMap.get(deviceId) || null
    }

    getAllStatuses() {
        const out = {}
        for (const [id, status] of this.statusMap.entries()) {
            out[id] = { ...status }
        }
        return out
    }

    clearAll() {
        this.statusMap.clear()
    }
}

module.exports = new StatusBus()
module.exports.StatusBus = StatusBus
