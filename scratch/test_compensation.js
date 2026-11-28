const assert = require('assert')
const os = require('os')
const path = require('path')
const fs = require('fs')

const tempParamsFile = path.join(os.tmpdir(), `auto-kvtm-test-params-${process.pid}-${Date.now()}.json`)
const tempProfilesFile = path.join(os.tmpdir(), `auto-kvtm-test-profiles-${process.pid}-${Date.now()}.json`)
const tempNotifyFile = path.join(os.tmpdir(), `auto-kvtm-test-notify-${process.pid}-${Date.now()}.json`)
const tempSchedulerFile = path.join(os.tmpdir(), `auto-kvtm-test-scheduler-${process.pid}-${Date.now()}.json`)
const tempStatsFile = path.join(os.tmpdir(), `auto-kvtm-test-stats-${process.pid}-${Date.now()}.json`)
const tempFeedbackConfigFile = path.join(os.tmpdir(), `auto-kvtm-test-feedback-cfg-${process.pid}-${Date.now()}.json`)
const tempFeedbackErrLogFile = path.join(os.tmpdir(), `auto-kvtm-test-feedback-err-${process.pid}-${Date.now()}.txt`)
const tempActivityLogFile = path.join(os.tmpdir(), `auto-kvtm-test-activity-log-${process.pid}-${Date.now()}.json`)
const tempBackupRoot = path.join(os.tmpdir(), `auto-kvtm-test-backup-${process.pid}-${Date.now()}`)
process.env.PARAMS_USER_FILE = tempParamsFile
process.env.PROFILES_FILE = tempProfilesFile
process.env.NOTIFY_FILE = tempNotifyFile
process.env.SCHEDULER_FILE = tempSchedulerFile
process.env.STATS_FILE = tempStatsFile
process.env.FEEDBACK_CONFIG_FILE = tempFeedbackConfigFile
process.env.ACTIVITY_LOG_FILE = tempActivityLogFile
process.env.BACKUP_DATA_DIR = path.join(tempBackupRoot, 'data')
process.env.BACKUP_AUTO_DIR = path.join(tempBackupRoot, 'auto')
process.env.BACKUP_ITEM_DIR = path.join(tempBackupRoot, 'item')

const http = require('http')
const Jimp = require('jimp')
const { Driver } = require('../server/src/engine/webdriverio')
const { isValidDeviceId, sanitizeDeviceId, parseWmSize } = require('../server/src/engine/adb')
const { tapDevicePoint } = require('../server/src/api/device')
const { findCoordinates, detectBugInROIs, testMatchCoordinates, invalidateTemplateCache, getTemplateCacheStats } = require('../server/src/engine/image')
const { Runner, isSessionLostError } = require('../server/src/engine/runner')
const { P, saveAll, resetAll } = require('../server/src/services/params')
const { getProfiles, saveProfile, deleteProfile } = require('../server/src/services/profiles')
const { getHealth } = require('../server/src/api/health')
const statusBus = require('../server/src/services/statusBus')
const { getNotifyConfig, saveNotifyConfig, sendAlert, resetNotifyCooldowns } = require('../server/src/services/notify')
const { getSchedulerData, saveSchedule, deleteSchedule, savePlaylist, deletePlaylist, evaluateDueSchedules } = require('../server/src/services/scheduler')
const { getStats, resetStats, recordLoop, recordBugCaught, recordRestart, recordOcr } = require('../server/src/services/stats')
const { exportBackup, restoreBackup } = require('../server/src/api/backup')
const { getFeedbackStatus, sanitizeSensitiveText, validateFeedbackPayload, submitFeedback, resetFeedbackCooldowns } = require('../server/src/services/feedback')
const { getFaqHandler, submitFeedbackHandler } = require('../server/src/api/feedback')
const activityLog = require('../server/src/services/activityLog')
const { saveLogSettingsHandler, getActivityHistoryHandler } = require('../server/src/api/logs')
const core = require('../server/src/games/sky-garden/core')
const { SellItemOptions } = require('../server/src/games/sky-garden/const')

function createMockDriver() {
    let pausedMs = []
    let pointerMoves = []
    let actionsCalled = 0
    let upCalled = 0
    let downCalled = 0
    let executedScripts = []

    const mockChain = {
        move: (opts) => {
            pointerMoves.push(opts)
            return mockChain
        },
        down: () => {
            downCalled++
            return mockChain
        },
        pause: () => mockChain,
        up: () => {
            upCalled++
            return mockChain
        },
        perform: async () => {},
    }

    const mockDriver = {
        action: () => {
            actionsCalled++
            return mockChain
        },
        pause: async (ms) => {
            pausedMs.push(ms)
        },
        executeScript: async (script, args) => {
            executedScripts.push({ script, args })
        },
        getWindowSize: async () => ({ width: 1000, height: 1000 }),
        _getPausedMs: () => pausedMs,
        _getPointerMoves: () => pointerMoves,
        _getExecutedScripts: () => executedScripts,
        _getDownCount: () => downCalled,
        _getUpCount: () => upCalled,
        _clear: () => {
            pausedMs = []
            pointerMoves = []
            executedScripts = []
            actionsCalled = 0
            upCalled = 0
            downCalled = 0
        },
    }

    return mockDriver
}

async function runTests() {
    console.log('=== STARTING DEEP TESTS: Dynamic Sleep Compensation ===\n')

    try {
        // --- Test 1: Verification of Schema & Params Service for Boolean ---
        console.log('Test 1: Verify params schema and getter/setter for boolean...')
        resetAll()
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, 'Default dynamicSleepCompensation should be true')
        assert.strictEqual(P('global.speedMultiplier'), 1.0, 'Default speedMultiplier should be 1.0')

        // Setting false
        saveAll({ 'global.dynamicSleepCompensation': false })
        assert.strictEqual(P('global.dynamicSleepCompensation'), false, 'Should be false after user override')

        // Setting true
        saveAll({ 'global.dynamicSleepCompensation': true })
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, 'Should be true after user override')

        // Setting string 'false' / 'true'
        saveAll({ 'global.dynamicSleepCompensation': 'false' })
        assert.strictEqual(P('global.dynamicSleepCompensation'), false, "String 'false' should clamp to false")
        saveAll({ 'global.dynamicSleepCompensation': 'true' })
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, "String 'true' should clamp to true")

        // Passing undefined/null should NOT corrupt boolean to false
        resetAll()
        assert.strictEqual(P('global.dynamicSleepCompensation'), true)
        saveAll({ 'global.dynamicSleepCompensation': undefined })
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, 'Passing undefined to saveAll should preserve default true')
        saveAll({ 'global.dynamicSleepCompensation': null })
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, 'Passing null to saveAll should preserve default true')
        saveAll({ 'global.dynamicSleepCompensation': 'invalid_string' })
        assert.strictEqual(P('global.dynamicSleepCompensation'), true, 'Passing invalid string should preserve default true')
        console.log('  -> PASSED: Params schema & boolean handling are correct and robust against undefined/null.\n')

        // --- Test 2: Mốc 1x (Standard baseline) ---
        console.log('Test 2: Baseline 1.0x (No extra latency)...')
        saveAll({ 'global.speedMultiplier': 1.0, 'global.dynamicSleepCompensation': true })
        let mock = createMockDriver()
        let driver = new Driver(mock, 'test-device')

        const samplePoints = [
            { duration: 0, x: 20, y: 20 },
            { duration: 1200, x: 80, y: 80 },
        ]

        await driver.action(samplePoints)
        assert.strictEqual(driver.accumulatedDelay, 0, '1x accumulatedDelay must remain 0')

        await driver.sleep(2)
        assert.deepStrictEqual(mock._getPausedMs(), [2000], '1x sleep(2) must pause exactly 2000ms')
        assert.strictEqual(driver.accumulatedDelay, 0, '1x accumulatedDelay after sleep must remain 0')
        console.log('  -> PASSED: 1.0x baseline has 0 delta and full sleep duration.\n')

        // --- Test 3: Mốc 1.5x ---
        console.log('Test 3: Speed multiplier 1.5x...')
        saveAll({ 'global.speedMultiplier': 1.5, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        // 1200 * 1.5 = 1800, delta = 600ms
        assert.strictEqual(driver.accumulatedDelay, 600, '1.5x accumulatedDelay should be 600ms')

        await driver.sleep(2)
        // 2000 - 600 = 1400ms
        assert.deepStrictEqual(mock._getPausedMs(), [1400], '1.5x sleep(2) should pause 1400ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should be 0 after full deduction')
        console.log('  -> PASSED: 1.5x gesture duration + sleep duration = 1800 + 1400 = 3200ms (identical to 1x).\n')

        // --- Test 4: Mốc 2.0x ---
        console.log('Test 4: Speed multiplier 2.0x...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        // 1200 * 2 = 2400, delta = 1200ms
        assert.strictEqual(driver.accumulatedDelay, 1200, '2.0x accumulatedDelay should be 1200ms')

        await driver.sleep(2)
        // 2000 - 1200 = 800ms
        assert.deepStrictEqual(mock._getPausedMs(), [800], '2.0x sleep(2) should pause 800ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should be 0 after full deduction')
        console.log('  -> PASSED: 2.0x gesture duration + sleep duration = 2400 + 800 = 3200ms (identical to 1x).\n')

        // --- Test 5: Mốc 2.5x ---
        console.log('Test 5: Speed multiplier 2.5x...')
        saveAll({ 'global.speedMultiplier': 2.5, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        // 1200 * 2.5 = 3000, delta = 1800ms
        assert.strictEqual(driver.accumulatedDelay, 1800, '2.5x accumulatedDelay should be 1800ms')

        await driver.sleep(2)
        // 2000 - 1800 = 200ms
        assert.deepStrictEqual(mock._getPausedMs(), [200], '2.5x sleep(2) should pause 200ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should be 0 after full deduction')
        console.log('  -> PASSED: 2.5x gesture duration + sleep duration = 3000 + 200 = 3200ms (identical to 1x).\n')

        // --- Test 6: Delta lớn hơn sleep(s) (Bảo lưu phần dư cho lần sleep kế tiếp) ---
        console.log('Test 6: Delta > sleep (Remainder carries over to next sleep)...')
        saveAll({ 'global.speedMultiplier': 3.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        // 1200 * 3.0 = 3600, delta = 2400ms
        assert.strictEqual(driver.accumulatedDelay, 2400, '3.0x accumulatedDelay should be 2400ms')

        // First sleep: 2 seconds (2000ms) -> deduct 2000, actual pause 0, remainder 400ms
        await driver.sleep(2)
        assert.strictEqual(mock._getPausedMs()[0], 0, 'First sleep should be reduced to 0ms')
        assert.strictEqual(driver.accumulatedDelay, 400, 'Remainder of 400ms must be preserved')

        // Second sleep: 1 second (1000ms) -> deduct 400, actual pause 600ms, remainder 0
        await driver.sleep(1)
        assert.strictEqual(mock._getPausedMs()[1], 600, 'Second sleep should be 1000 - 400 = 600ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should now be 0')
        console.log('  -> PASSED: Remainder properly carries over and deducts from subsequent sleep.\n')

        // --- Test 7: Multi-action accumulation ---
        console.log('Test 7: Accumulation over multiple actions before sleep...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        const action1 = [
            { duration: 0, x: 10, y: 10 },
            { duration: 200, x: 20, y: 20 }, // delta = 200
        ]
        const action2 = [
            { duration: 0, x: 30, y: 30 },
            { duration: 300, x: 40, y: 40 }, // delta = 300
        ]

        await driver.action(action1)
        assert.strictEqual(driver.accumulatedDelay, 200, 'After action 1, delta should be 200')
        await driver.action(action2)
        assert.strictEqual(driver.accumulatedDelay, 500, 'After action 2, delta should accumulate to 500')

        await driver.sleep(1)
        assert.strictEqual(mock._getPausedMs()[0], 500, 'Sleep of 1000ms - 500ms should pause 500ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'After deduction, accumulatedDelay should be 0')
        console.log('  -> PASSED: Multi-action accumulated delay successfully deducted.\n')

        // --- Test 8: Khi tắt dynamicSleepCompensation (Switch = false) ---
        console.log('Test 8: Disabled dynamicSleepCompensation...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': false })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        assert.strictEqual(driver.accumulatedDelay, 0, 'When disabled, accumulatedDelay should remain 0')

        await driver.sleep(2)
        assert.deepStrictEqual(mock._getPausedMs(), [2000], 'When disabled, sleep should pause full 2000ms')
        console.log('  -> PASSED: When disabled, system behaves like standard sleep without deductions.\n')

        // --- Test 9: Single-point gesture action (points.length === 1) ---
        console.log('Test 9: Single-point gesture (points.length === 1)...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        // Duration 100 at 2x: safe = 200, orig = 100, delta = 100.
        // MUST NOT count twice (previous bug gave 200)!
        await driver.action([{ duration: 100, x: 10, y: 10 }])
        assert.strictEqual(driver.accumulatedDelay, 100, 'Single point delta must be exactly 100, not double-counted')
        assert.strictEqual(mock._getPointerMoves().length, 1, 'Should execute exactly 1 pointer move')
        assert.strictEqual(mock._getDownCount(), 1, 'Should execute 1 down')
        assert.strictEqual(mock._getUpCount(), 1, 'Should execute 1 up')
        console.log('  -> PASSED: Single point gesture handled accurately without double-delta or double-touch.\n')

        // --- Test 10: Missing/undefined/null/NaN duration on points ---
        console.log('Test 10: Missing or invalid duration on points...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        // Points without duration
        await driver.action([{ x: 10, y: 10 }, { x: 20, y: 20 }])
        assert(!isNaN(driver.accumulatedDelay), 'accumulatedDelay must not be NaN')
        for (const m of mock._getPointerMoves()) {
            assert(!isNaN(m.duration), `move duration must never be NaN (got ${m.duration})`)
        }

        // Points with null/string duration
        await driver.action([{ duration: null, x: 10, y: 10 }, { duration: 'invalid', x: 20, y: 20 }])
        assert(!isNaN(driver.accumulatedDelay), 'accumulatedDelay must remain a valid number')
        console.log('  -> PASSED: Missing/invalid durations sanitized cleanly without NaN.\n')

        // --- Test 11: Dynamic mid-flow toggle off ---
        console.log('Test 11: Dynamic mid-flow toggle off...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        await driver.action(samplePoints)
        assert.strictEqual(driver.accumulatedDelay, 1200)

        // User turns off compensation before sleep
        saveAll({ 'global.dynamicSleepCompensation': false })
        await driver.sleep(2)
        assert.deepStrictEqual(mock._getPausedMs(), [2000], 'Sleep after toggle-off must pause full 2000ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay must be reset to 0')
        console.log('  -> PASSED: Mid-flow disable cleanly resets accumulator and restores full sleep.\n')

        // --- Test 12: Invalid sleep arguments and self-healing ---
        console.log('Test 12: Invalid sleep arguments & self-healing...')
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')

        // sleep('abc'), sleep(undefined), sleep(-5)
        await driver.sleep('abc')
        await driver.sleep(undefined)
        await driver.sleep(-5)
        assert.deepStrictEqual(mock._getPausedMs(), [0, 0, 0], 'Invalid sleep arguments must pause 0ms, not NaN')

        // Corrupted accumulatedDelay self-healing
        driver.accumulatedDelay = NaN
        await driver.sleep(1)
        assert.strictEqual(driver.accumulatedDelay, 0, 'Corrupted NaN accumulatedDelay must self-heal to 0')
        assert.strictEqual(mock._getPausedMs()[3], 1000, 'Self-healed sleep should pause full 1000ms')

        // Invalid array elements: [null], [{}]
        await driver.action([null])
        await driver.action([undefined])
        assert.strictEqual(driver.accumulatedDelay, 0, 'Null/undefined points array should not crash or accumulate')
        console.log('  -> PASSED: Invalid sleep arguments and corrupted states safely handled.\n')

        // --- Test 13: Newly added params in schema ---
        console.log('Test 13: Newly added params schema verification...')
        resetAll()
        assert.strictEqual(P('make.collectDelay'), 0.1, 'Default make.collectDelay should be 0.1')
        assert.strictEqual(P('make.afterMakeDelay'), 0.2, 'Default make.afterMakeDelay should be 0.2')
        assert.strictEqual(P('make.closePanelDelay'), 0.1, 'Default make.closePanelDelay should be 0.1')
        assert.strictEqual(P('sell.openShopDelay'), 1.0, 'Default sell.openShopDelay should be 1.0')
        assert.strictEqual(P('sell.afterScrollDelay'), 0.5, 'Default sell.afterScrollDelay should be 0.5')
        assert.strictEqual(P('sell.selectSlotDelay'), 0.5, 'Default sell.selectSlotDelay should be 0.5')
        assert.strictEqual(P('sell.collectMoneyDelay'), 0.5, 'Default sell.collectMoneyDelay should be 0.5')
        assert.strictEqual(P('bug.tapPotDelay'), 0.5, 'Default bug.tapPotDelay should be 0.5')
        assert.strictEqual(P('bug.afterNetDelay'), 0.5, 'Default bug.afterNetDelay should be 0.5')
        assert.strictEqual(P('bug.closePanelDelay'), 0.5, 'Default bug.closePanelDelay should be 0.5')
        assert.strictEqual(P('image.postTapDelay'), 0.05, 'Default image.postTapDelay should be 0.05')

        // Test overrides
        saveAll({
            'make.collectDelay': 0.15,
            'make.afterMakeDelay': 0.35,
            'make.closePanelDelay': 0.2,
            'sell.openShopDelay': 1.5,
            'sell.afterScrollDelay': 0.8,
            'sell.selectSlotDelay': 0.6,
            'sell.collectMoneyDelay': 0.7,
            'bug.tapPotDelay': 0.4,
            'bug.afterNetDelay': 0.6,
            'bug.closePanelDelay': 0.45,
            'image.postTapDelay': 0.1,
        })
        assert.strictEqual(P('make.collectDelay'), 0.15)
        assert.strictEqual(P('make.afterMakeDelay'), 0.35)
        assert.strictEqual(P('make.closePanelDelay'), 0.2)
        assert.strictEqual(P('sell.openShopDelay'), 1.5)
        assert.strictEqual(P('sell.afterScrollDelay'), 0.8)
        assert.strictEqual(P('sell.selectSlotDelay'), 0.6)
        assert.strictEqual(P('sell.collectMoneyDelay'), 0.7)
        assert.strictEqual(P('bug.tapPotDelay'), 0.4)
        assert.strictEqual(P('bug.afterNetDelay'), 0.6)
        assert.strictEqual(P('bug.closePanelDelay'), 0.45)
        assert.strictEqual(P('image.postTapDelay'), 0.1)
        console.log('  -> PASSED: All 11 new parameters correctly defined and overridable.\n')

        // --- Test 14: Swipe gesture speed scaling & execution ---
        console.log('Test 14: Swipe gesture speed scaling...')
        resetAll()
        saveAll({ 'global.speedMultiplier': 1.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize()

        // 1x without configured swipeSpeed -> speed not passed (Appium default)
        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 60 }, 'down')
        let scripts = mock._getExecutedScripts()
        assert.strictEqual(scripts.length, 1)
        assert.strictEqual(scripts[0].script, 'mobile:swipeGesture')
        assert.strictEqual(scripts[0].args[0].speed, undefined, 'At 1x without swipeSpeed, speed should be omitted')
        assert.strictEqual(driver.accumulatedDelay, 0, 'At 1x, swipe delta must be 0')

        // 2x with default swipeSpeed (baseSpeed = 5000)
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock._clear()
        // swipe height = 10% on 1000px height = 100px.
        // baseSpeed = 5000 px/s, scaledSpeed = 2500 px/s.
        // tOrig = (100 / 5000) * 1000 = 20ms
        // tActual = (100 / 2500) * 1000 = 40ms
        // delta = 20ms
        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 60 }, 'down')
        scripts = mock._getExecutedScripts()
        assert.strictEqual(scripts.length, 1)
        assert.strictEqual(scripts[0].args[0].speed, 2500, 'At 2x, speed must be 5000 / 2 = 2500')
        assert.strictEqual(driver.accumulatedDelay, 20, 'Swipe accumulatedDelay should be 20ms')

        // Sleep should deduct this 20ms
        await driver.sleep(0.1) // 100ms - 20ms = 80ms
        assert.deepStrictEqual(mock._getPausedMs(), [80], 'Sleep after swipe should deduct 20ms delta')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should return to 0')
        console.log('  -> PASSED: Swipe speed properly scaled to 2500 px/s and delta deducted from sleep.\n')

        // --- Test 15: Swipe gesture with configured user speed & minimum clamp ---
        console.log('Test 15: Swipe gesture with user-configured speed and min clamp (500 px/s)...')
        // user swipeSpeed = 800, multiplier = 2.0 -> scaled = 400 clamped to 500
        saveAll({ 'global.speedMultiplier': 2.0, 'scroll.swipeSpeed': 800, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize()

        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 60 }, 'down')
        scripts = mock._getExecutedScripts()
        assert.strictEqual(scripts[0].args[0].speed, 500, 'Speed must be clamped to min 500 px/s')
        console.log('  -> PASSED: Swipe speed clamps correctly to minimum 500 px/s.\n')

        // --- Test 16: Tap postTapDelay and dynamic compensation ---
        console.log('Test 16: Tap postTapDelay at 1x and 2x with compensation...')
        resetAll()
        saveAll({ 'global.speedMultiplier': 1.0, 'image.postTapDelay': 0.05, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize()

        // At 1x: postTapDelay = 0.05s -> pauses 50ms, delta = 0
        await driver.tap(50, 50)
        assert.deepStrictEqual(mock._getPausedMs(), [50], 'Tap at 1x should pause 50ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'Tap at 1x has 0 delta')

        // At 2x: postTapDelay = 0.05s -> pauses 100ms, delta = 50ms
        saveAll({ 'global.speedMultiplier': 2.0, 'image.postTapDelay': 0.05, 'global.dynamicSleepCompensation': true })
        mock._clear()
        await driver.tap(50, 50)
        assert.deepStrictEqual(mock._getPausedMs(), [100], 'Tap at 2x should pause 100ms')
        assert.strictEqual(driver.accumulatedDelay, 50, 'Tap at 2x accumulates 50ms delta')

        // Subsequent sleep of 0.2s (200ms) should deduct 50ms -> pause 150ms
        await driver.sleep(0.2)
        assert.strictEqual(mock._getPausedMs()[1], 150, 'Sleep(0.2) should pause 200 - 50 = 150ms')
        assert.strictEqual(driver.accumulatedDelay, 0, 'accumulatedDelay should return to 0')

        // When postTapDelay = 0: no pause
        saveAll({ 'image.postTapDelay': 0 })
        mock._clear()
        await driver.tap(50, 50)
        assert.deepStrictEqual(mock._getPausedMs(), [], 'Tap with 0 postTapDelay should not pause')
        console.log('  -> PASSED: Tap postTapDelay pauses properly and scales/compensates cleanly.\n')

        // --- Test 17: Full game action sequence (Tap + Swipe + Sleep cycle) ---
        console.log('Test 17: Combined Tap + Swipe + Sleep cycle simulation...')
        saveAll({ 'global.speedMultiplier': 2.0, 'image.postTapDelay': 0.05, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize()

        // Simulate: tap pot -> sleep(bug.tapPotDelay) -> swipe net -> sleep(bug.afterNetDelay) -> tap close -> sleep(bug.closePanelDelay)
        // 1) Tap pot: pauses 100ms, delta = +50ms
        await driver.tap(30, 40)
        assert.strictEqual(driver.accumulatedDelay, 50)

        // 2) sleep(0.5): 500ms - 50ms = 450ms pause. accumulatedDelay = 0
        await driver.sleep(P('bug.tapPotDelay')) // 0.5
        assert.strictEqual(driver.accumulatedDelay, 0)
        assert.strictEqual(mock._getPausedMs()[1], 450)

        // 3) Swipe: 10% height -> 100px. 5000/2=2500 px/s -> delta = +20ms
        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 60 }, 'down')
        assert.strictEqual(driver.accumulatedDelay, 20)

        // 4) sleep(0.5): 500ms - 20ms = 480ms pause. accumulatedDelay = 0
        await driver.sleep(P('bug.afterNetDelay')) // 0.5
        assert.strictEqual(driver.accumulatedDelay, 0)
        assert.strictEqual(mock._getPausedMs()[2], 480)

        // Total time check:
        // At 1x: tap(50) + sleep(500) + swipe(20) + sleep(500) = 1070ms
        // At 2x: tap(100) + sleep(450) + swipe(40) + sleep(480) = 1070ms!
        console.log('  -> PASSED: Combined workflow maintains identical cycle time between 1x and 2x.\n')

        // --- Test 18: Defensive saveAll against null/undefined ---
        console.log('Test 18: Defensive saveAll handling against null/non-object...')
        assert.doesNotThrow(() => saveAll(null), 'saveAll(null) should not throw')
        assert.doesNotThrow(() => saveAll(undefined), 'saveAll(undefined) should not throw')
        assert.doesNotThrow(() => saveAll('not-an-object'), 'saveAll(string) should not throw')
        console.log('  -> PASSED: saveAll handles null/non-object cleanly without crashing.\n')

        // --- Test 19: Boundary clamping for tap coordinates ---
        console.log('Test 19: Tap screen boundary clamping (0% and 100% with random offset)...')
        saveAll({ 'image.tapRandomOffset': 10 })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize() // width=1000, height=1000

        for (let i = 0; i < 20; i++) {
            await driver.tap(0, 0)
            let scripts = mock._getExecutedScripts()
            let lastTap = scripts[scripts.length - 1].args[0]
            assert(lastTap.x >= 0 && lastTap.x < 1000, `tap(0,0) x=${lastTap.x} must stay in [0, 999]`)
            assert(lastTap.y >= 0 && lastTap.y < 1000, `tap(0,0) y=${lastTap.y} must stay in [0, 999]`)

            await driver.tap(100, 100)
            scripts = mock._getExecutedScripts()
            lastTap = scripts[scripts.length - 1].args[0]
            assert(lastTap.x >= 0 && lastTap.x < 1000, `tap(100,100) x=${lastTap.x} must stay in [0, 999]`)
            assert(lastTap.y >= 0 && lastTap.y < 1000, `tap(100,100) y=${lastTap.y} must stay in [0, 999]`)
        }
        console.log('  -> PASSED: Tap coordinates stay strictly within display bounds regardless of jitter.\n')

        // --- Test 20: Swipe bounding box dimensions & boundary clamping ---
        console.log('Test 20: Swipe bounding box dimensions & display boundary containment...')
        saveAll({ 'image.tapRandomOffset': 10 })
        mock._clear()
        // Swiping near right-bottom edge: pointA = 95, 95, pointB = 95, 100
        await driver.swipe({ x: 95, y: 95 }, { x: 95, y: 100 }, 'down')
        let swipeArgs = mock._getExecutedScripts()[0].args[0]
        assert(swipeArgs.left >= 0, `swipe left=${swipeArgs.left} must be >= 0`)
        assert(swipeArgs.top >= 0, `swipe top=${swipeArgs.top} must be >= 0`)
        assert(swipeArgs.width >= 1, `swipe width=${swipeArgs.width} must be >= 1`)
        assert(swipeArgs.height >= 1, `swipe height=${swipeArgs.height} must be >= 1`)
        assert(swipeArgs.left + swipeArgs.width <= 1000, `left+width (${swipeArgs.left}+${swipeArgs.width}) must be <= 1000`)
        assert(swipeArgs.top + swipeArgs.height <= 1000, `top+height (${swipeArgs.top}+${swipeArgs.height}) must be <= 1000`)
        console.log('  -> PASSED: Swipe bounding box is guaranteed inside display bounds.\n')

        // --- Test 21: Non-compensated retry sleep preserves full pause & accumulatedDelay ---
        console.log('Test 21: Non-compensated sleep({ compensate: false }) keeps full delay & accumulatedDelay...')
        resetAll()
        saveAll({ 'global.speedMultiplier': 2.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'test-device')
        await driver.setCurrentWindowSize()

        await driver.tap(30, 40) // adds 50ms to accumulatedDelay
        assert.strictEqual(driver.accumulatedDelay, 50)
        await driver.sleep(0.1, { compensate: false })
        assert.strictEqual(mock._getPausedMs()[1], 100, 'Non-compensated sleep must pause full 100ms')
        assert.strictEqual(driver.accumulatedDelay, 50, 'Non-compensated sleep must not consume accumulatedDelay')
        console.log('  -> PASSED: Non-compensated retry sleep preserved both pause duration and accumulatedDelay.\n')

        // --- Test 22: ADB device ID validation and filename sanitization ---
        console.log('Test 22: Device ID validation and sanitization...')
        assert.strictEqual(isValidDeviceId('127.0.0.1:5555'), true, 'TCP ADB ID must be valid')
        assert.strictEqual(isValidDeviceId('emulator-5554'), true, 'Emulator ADB ID must be valid')
        assert.strictEqual(isValidDeviceId('foo; calc'), false, 'Shell metacharacters must be rejected')
        assert.strictEqual(isValidDeviceId('-s'), false, 'Leading hyphen flag injection must be rejected')
        assert.strictEqual(isValidDeviceId('../x'), false, 'Path traversal characters must be rejected')
        assert.strictEqual(sanitizeDeviceId('127.0.0.1:5555'), '127.0.0.1_5555', 'Colon must be sanitized for Windows filenames')
        console.log('  -> PASSED: Device ID validation and sanitization behave as expected.\n')

        // --- Test 23: Night-safe 2-tier sellItems & sellEventItems recovery ---
        console.log('Test 23: Night-safe 2-tier sellItems & sellEventItems stall recovery...')
        resetAll()
        saveAll({
            'sell.idleWaitWhenFull': 2,
            'sell.softRefreshCycles': 2,
            'sell.staleRestartMinutes': 15,
            'sell.maxStaleRestarts': 2,
            'sell.openShopDelay': 0,
            'sell.afterScrollDelay': 0,
            'sell.afterScrollToStartDelay': 0,
            'sell.emptySlotDelay': 0,
            'sell.selectSlotDelay': 0,
            'sell.collectMoneyDelay': 0,
            'scroll.delayBetweenSwipe': 0,
            'game.backToGameDelay': 0,
        })

        const origDateNow = Date.now
        const origOpenGame = core.openGame
        let fakeNow = 1700000000000
        Date.now = () => fakeNow
        try {
            let openShopTaps = 0
            let backPresses = 0
            let openGameCalls = 0
            let slotAvailable = false
            let stopped = false
            let soldTaps = 0
            let sleepCalls = []

            core.openGame = async () => {
                openGameCalls++
                slotAvailable = true
            }

            const mockSellDriver = {
                deviceId: 'test-night',
                tap: async (x, y) => {
                    if (Math.abs(x - 64.3) < 0.2 && Math.abs(y - 85.5) < 0.2) {
                        openShopTaps++
                        if (openShopTaps === 2) {
                            // After Tier 1 reopen, advance clock past 15m so next empty cycle hits Tier 2
                            fakeNow += 16 * 60 * 1000
                        }
                    }
                },
                press: async () => {
                    backPresses++
                },
                sleep: async (s) => {
                    sleepCalls.push(s)
                    fakeNow += Math.round((Number(s) || 0) * 1000)
                },
                swipe: async () => {},
                action: async () => {},
                getCoordinateItemOnScreen: async (itemPath) => {
                    if (!slotAvailable) return null
                    if (itemPath && itemPath.includes('o-trong-ban')) {
                        return { x: 30, y: 43.5 }
                    }
                    return null
                },
                tapItemOnScreen: async () => {
                    if (!slotAvailable) return false
                    soldTaps++
                    return true
                },
                haveItemOnScreen: async () => false,
                isStopped: () => stopped,
            }

            const items = [{ key: 'p-dua', value: 2 }]
            const mutex = { value: 0 }
            const mutex2 = { value: 0 }
            await core.sellItems(mockSellDriver, SellItemOptions.tree, items, mutex, mutex2, false, false, false, true)

            assert(openShopTaps >= 3, `Expected >= 3 shop opens (init + Tier 1 + Tier 2), got ${openShopTaps}`)
            assert(backPresses >= 5, `Expected backToGame presses during Tier 1, got ${backPresses}`)
            assert.strictEqual(openGameCalls, 1, 'Expected Tier 2 openGame restart to fire once')
            assert.strictEqual(mutex2.value, 2, 'Expected exact 2 items sold across Tier 1 & Tier 2 recovery')
            assert.strictEqual(items[0].value, 0, 'Expected remaining item quantity to reach 0')
            assert.strictEqual(soldTaps, 2, 'Expected exact 2 item slot taps')

            // Subtest B: Stop flag interrupts long idleWaitWhenFull immediately
            saveAll({ 'sell.idleWaitWhenFull': 30, 'sell.softRefreshCycles': 10, 'sell.staleRestartMinutes': 0 })
            slotAvailable = false
            sleepCalls = []
            stopped = false
            const stopDriver = {
                ...mockSellDriver,
                sleep: async (s) => {
                    sleepCalls.push(s)
                    if (s === 1) stopped = true
                },
                isStopped: () => stopped,
            }
            await core.sellItems(stopDriver, SellItemOptions.tree, [{ key: 'p-dua', value: 1 }], { value: 0 }, { value: 0 }, false, false, false, true)
            assert(sleepCalls.filter((x) => x === 1).length <= 2, 'isStopped must interrupt 30s idle wait immediately')

            // Subtest C: sellEventItems with isAds=false preserves cnt across soft reopen
            saveAll({ 'sell.idleWaitWhenFull': 1, 'sell.softRefreshCycles': 0, 'sell.staleRestartMinutes': 0, 'sell.openShopDelay': 0, 'sell.afterScrollDelay': 0, 'sell.selectSlotDelay': 0, 'sell.collectMoneyDelay': 0, 'game.backToGameDelay': 0 })
            let eventSales = 0
            let eventSlotOpen = true
            let eventReopens = 0
            const eventDriver = {
                ...mockSellDriver,
                tap: async (x, y) => {
                    if (Math.abs(x - 66.25) < 0.2 && Math.abs(y - 83.7) < 0.2) {
                        eventReopens++
                        if (eventReopens >= 2) eventSlotOpen = true
                    }
                },
                getCoordinateItemOnScreen: async (itemPath) => {
                    if (eventSlotOpen && itemPath && itemPath.includes('o-trong-ban')) {
                        return { x: 30, y: 43.5 }
                    }
                    return null
                },
                tapItemOnScreen: async () => {
                    if (!eventSlotOpen) return false
                    eventSales++
                    eventSlotOpen = false
                    return true
                },
                isStopped: () => false,
            }
            await core.sellEventItems(eventDriver, 'event-bo', 2, false)
            assert.strictEqual(eventSales, 2, 'sellEventItems(isAds=false) must sell exact quantity without resetting cnt')
            assert(eventReopens >= 2, 'sellEventItems must reopen shop when full')
            console.log('  -> PASSED: Night-safe 2-tier selling recovery preserves quantities and interrupts cleanly.\n')
        } finally {
            Date.now = origDateNow
            core.openGame = origOpenGame
        }

        // --- Test 24: Per-device driver.speedMultiplierOverride ---
        console.log('Test 24: Per-device driver.speedMultiplierOverride overrides global 1x...')
        resetAll()
        saveAll({ 'global.speedMultiplier': 1.0, 'global.dynamicSleepCompensation': true })
        mock = createMockDriver()
        driver = new Driver(mock, 'slow-emu')
        driver.speedMultiplierOverride = 2.0
        await driver.setCurrentWindowSize()

        await driver.action([
            { duration: 200, x: 10, y: 10 },
            { duration: 400, x: 50, y: 50 },
        ])
        let overrideMoves = mock._getPointerMoves()
        assert.strictEqual(overrideMoves[0].duration, 400, 'Start move duration should scale with 2x override')
        assert.strictEqual(overrideMoves[1].duration, 800, 'End move duration should scale with 2x override')
        assert.strictEqual(driver.accumulatedDelay, 600, 'Accumulated delay should reflect 2x override delta')
        await driver.sleep(1.0)
        assert.strictEqual(mock._getPausedMs()[0], 400, 'Sleep should compensate 600ms from 1000ms')
        console.log('  -> PASSED: Per-device speedMultiplierOverride works independently of global setting.\n')

        // --- Test 25: OpenCV templateCache hit & invalidation ---
        console.log('Test 25: OpenCV templateCache caching & invalidation...')
        invalidateTemplateCache()
        assert.strictEqual(getTemplateCacheStats().templates, 0)
        const sampleTemplate = path.resolve(__dirname, '../server/src/games/sky-garden/item/shop-gem.png')
        const dummyPng = await new Jimp(100, 100, 0xffffffff).getBufferAsync(Jimp.MIME_PNG)
        await findCoordinates(dummyPng, sampleTemplate)
        assert.strictEqual(getTemplateCacheStats().templates, 1, 'First lookup should populate templateCache')
        await findCoordinates(dummyPng, sampleTemplate)
        assert.strictEqual(getTemplateCacheStats().templates, 1, 'Second lookup should reuse cached Mat without errors')
        invalidateTemplateCache(sampleTemplate)
        assert.strictEqual(getTemplateCacheStats().templates, 0, 'Invalidation should evict template from cache')
        invalidateTemplateCache()
        console.log('  -> PASSED: OpenCV templateCache hits cleanly and frees on invalidation.\n')

        // --- Test 26: Profiles CRUD & Health endpoint ---
        console.log('Test 26: Profiles CRUD service and Health endpoint handler...')
        const saved = saveProfile({
            name: 'Acc chinh dem',
            selectedGame: 'sky-garden',
            selectedAuto: 'bantra',
            deviceIds: ['127.0.0.1:5555', '127.0.0.1:5555', 'bad; cmd'],
            speedMultiplierOverride: 5,
            gameOptions: { runAuto: 'bantra', sellItems: true },
        })
        assert.strictEqual(saved.profiles.length, 1)
        assert.deepStrictEqual(saved.profile.deviceIds, ['127.0.0.1:5555'], 'Should deduplicate and strip invalid device IDs')
        assert.strictEqual(saved.profile.speedMultiplierOverride, 3, 'Should clamp speed override to max 3')
        assert.strictEqual(getProfiles().length, 1)

        const updated = saveProfile({
            name: 'acc chinh dem',
            selectedGame: 'sky-garden',
            selectedAuto: 'vp-1',
            deviceIds: ['emulator-5554'],
            gameOptions: { runAuto: 'vp-1' },
        })
        assert.strictEqual(updated.profiles.length, 1, 'Same case-insensitive name should update existing profile')
        assert.strictEqual(updated.profile.selectedAuto, 'vp-1')

        const afterDel = deleteProfile(updated.profile.id)
        assert.strictEqual(afterDel.length, 0)

        let healthPayload = null
        await getHealth({}, { json: (data) => { healthPayload = data } })
        assert(healthPayload && typeof healthPayload.memoryMb === 'number', 'Health should report memoryMb')
        assert(healthPayload.adb && typeof healthPayload.adb.port === 'number', 'Health should report adb port')
        assert(healthPayload.appium && typeof healthPayload.appium.ok === 'boolean', 'Health should report appium status')
        assert(healthPayload.ocr && typeof healthPayload.ocr.ok === 'boolean', 'Health should report ocr status')
        console.log('  -> PASSED: Profiles service and Health endpoint behave as expected.\n')

        // --- Test 27: StatusBus, Runner controls, Watchdog params & session loss matcher ---
        console.log('Test 27: StatusBus, Runner pause/resume/stopGraceful & Watchdog helpers...')
        statusBus.clearAll()
        assert.strictEqual(P('watchdog.enabled'), true)
        assert.strictEqual(P('watchdog.maxIdleMinutes'), 20)
        assert.strictEqual(P('watchdog.maxConsecutiveErrors'), 3)
        assert.strictEqual(P('watchdog.maxRecoveries'), 5)

        assert.strictEqual(isSessionLostError(new Error('invalid session id: abc')), true)
        assert.strictEqual(isSessionLostError(new Error('connect ECONNREFUSED 127.0.0.1:4723')), true)
        assert.strictEqual(isSessionLostError(new Error('normal script typo')), false)

        const events = []
        const onStat = (s) => events.push({ kind: 'status', s })
        const onLogEv = (l) => events.push({ kind: 'log', l })
        const onRem = (r) => events.push({ kind: 'removed', r })
        statusBus.on('status', onStat)
        statusBus.on('log', onLogEv)
        statusBus.on('removed', onRem)

        const runner = new Runner()
        runner.push('dev-p2', { selectedGame: 'sky-garden', gameOptions: { frequency: 3 } })
        runner.queue[0].isRunning = true
        const mockDrv = new Driver(createMockDriver(), 'dev-p2')
        runner.attachDriverHooks(runner.queue[0], mockDrv, 'dev-p2')

        mockDrv.setStep('Đang trồng cây')
        assert.strictEqual(statusBus.getStatus('dev-p2').currentStep, 'Đang trồng cây')

        assert.strictEqual(runner.pause('dev-p2'), true)
        assert.strictEqual(statusBus.getStatus('dev-p2').isPaused, true)
        assert.strictEqual(statusBus.getStatus('dev-p2').state, 'paused')

        let unblocked = false
        const waitPromise = mockDrv.waitIfPaused().then(() => { unblocked = true })
        await new Promise((r) => setTimeout(r, 80))
        assert.strictEqual(unblocked, false, 'waitIfPaused must remain blocked while paused')

        assert.strictEqual(runner.resume('dev-p2'), true)
        await waitPromise
        assert.strictEqual(unblocked, true, 'waitIfPaused must unblock after resume')
        assert.strictEqual(statusBus.getStatus('dev-p2').state, 'running')

        assert.strictEqual(runner.stopGraceful('dev-p2'), true)
        assert.strictEqual(runner.queue[0].stopAfterLoop, true)
        assert.strictEqual(statusBus.getStatus('dev-p2').state, 'stopping')

        statusBus.appendLog('dev-p2', 'line 1\n')
        assert(events.some((e) => e.kind === 'log' && e.l.line === 'line 1\n'))
        statusBus.removeStatus('dev-p2')
        assert.strictEqual(statusBus.getStatus('dev-p2'), null)
        assert(events.some((e) => e.kind === 'removed' && e.r.deviceId === 'dev-p2'))

        statusBus.removeListener('status', onStat)
        statusBus.removeListener('log', onLogEv)
        statusBus.removeListener('removed', onRem)
        statusBus.clearAll()
        console.log('  -> PASSED: StatusBus, Runner controls, waitIfPaused, and Watchdog matchers passed.\n')

        // --- Test 28: Notify service config, rate-limiting & local webhook HTTP delivery ---
        console.log('Test 28: Notify service config, cooldown & local webhook delivery...')
        resetNotifyCooldowns()
        const receivedHooks = []
        const hookServer = http.createServer((req, res) => {
            const chunks = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => {
                receivedHooks.push({
                    contentType: req.headers['content-type'] || '',
                    body: Buffer.concat(chunks).toString('utf8'),
                })
                res.statusCode = 204
                res.end()
            })
        })
        await new Promise((resolve) => hookServer.listen(0, '127.0.0.1', resolve))
        try {
            const port = hookServer.address().port
            const cfg = saveNotifyConfig({
                enabled: true,
                discord: { enabled: true, webhookUrl: `http://127.0.0.1:${port}/webhook` },
                events: { sellStalled: true, runFinished: false },
                cooldownSeconds: 60,
            })
            assert.strictEqual(cfg.enabled, true)
            assert.strictEqual(getNotifyConfig().discord.webhookUrl, `http://127.0.0.1:${port}/webhook`)

            const disabledEv = await sendAlert('runFinished', { deviceId: 'd1', title: 'Done', message: 'Finished' })
            assert.strictEqual(disabledEv.skipped, 'event_disabled')

            const sent1 = await sendAlert('sellStalled', { deviceId: 'd1', title: 'Stalled', message: 'Restarting' })
            assert.strictEqual(sent1.sent, true)
            assert.strictEqual(receivedHooks.length, 1)
            assert(receivedHooks[0].body.includes('Stalled'))

            const cooled = await sendAlert('sellStalled', { deviceId: 'd1', title: 'Stalled', message: 'Again' })
            assert.strictEqual(cooled.skipped, 'cooldown')
            assert.strictEqual(receivedHooks.length, 1)

            const forced = await sendAlert('test', {
                deviceId: 'system',
                title: 'Multipart',
                message: 'With image',
                imageBuffer: Buffer.from('fakepng'),
                force: true,
            })
            assert.strictEqual(forced.sent, true)
            assert.strictEqual(receivedHooks.length, 2)
            assert(receivedHooks[1].contentType.includes('multipart/form-data'))
        } finally {
            await new Promise((resolve) => hookServer.close(resolve))
        }
        console.log('  -> PASSED: Notify service config, rate limiting, and webhook delivery passed.\n')

        // --- Test 29: Remaining Phase 1 checks (sellEventItems isAds=true, mtime reload & bug template cache) ---
        console.log('Test 29: sellEventItems(isAds=true), mtime templateCache reload & detectBugInROIs cache...')
        saveAll({ 'sell.idleWaitWhenFull': 0, 'sell.softRefreshCycles': 0, 'sell.staleRestartMinutes': 0, 'sell.openShopDelay': 0, 'sell.afterScrollDelay': 0, 'sell.selectSlotDelay': 0, 'sell.collectMoneyDelay': 0, 'game.backToGameDelay': 0 })
        let adsClicked = 0
        let adsSales = 0
        let adsSlotOpen = false
        let adsReopens = 0
        const adsEventDriver = {
            deviceId: 'test-ads',
            tap: async (x, y) => {
                if (Math.abs(x - 12.3) < 0.1 && Math.abs(y - 45.6) < 0.1) adsClicked++
                if (Math.abs(x - 66.25) < 0.2 && Math.abs(y - 83.7) < 0.2) {
                    adsReopens++
                    if (adsReopens >= 2) adsSlotOpen = true
                }
            },
            press: async () => {},
            sleep: async () => {},
            swipe: async () => {},
            action: async () => {},
            getCoordinateItemOnScreen: async (itemPath) => {
                if (itemPath && itemPath.includes('chua-qc')) return { x: 12.3, y: 45.6 }
                if (adsSlotOpen && itemPath && itemPath.includes('o-trong-ban')) return { x: 30, y: 43.5 }
                return null
            },
            tapItemOnScreen: async () => {
                if (!adsSlotOpen) return false
                adsSales++
                return true
            },
            haveItemOnScreen: async () => false,
            isStopped: () => false,
        }
        await core.sellEventItems(adsEventDriver, 'event-bo', 1, true)
        assert.strictEqual(adsSales, 1)
        assert(adsClicked >= 1, 'sellEventItems(isAds=true) should click chua-qc when full')

        // mtime change reload on temp copy
        invalidateTemplateCache()
        const srcGem = path.resolve(__dirname, '../server/src/games/sky-garden/item/shop-gem.png')
        const tmpTpl = path.join(os.tmpdir(), `auto-kvtm-tpl-${process.pid}.png`)
        fs.copyFileSync(srcGem, tmpTpl)
        try {
            const blankBuf = await new Jimp(200, 200, 0xffffffff).getBufferAsync(Jimp.MIME_PNG)
            await findCoordinates(blankBuf, tmpTpl)
            assert.strictEqual(getTemplateCacheStats().templates, 1)
            const nextTime = new Date(Date.now() + 5000)
            fs.utimesSync(tmpTpl, nextTime, nextTime)
            await findCoordinates(blankBuf, tmpTpl)
            assert.strictEqual(getTemplateCacheStats().templates, 1, 'Changed mtime should replace cache entry without leaking')
        } finally {
            invalidateTemplateCache(tmpTpl)
            if (fs.existsSync(tmpTpl)) fs.unlinkSync(tmpTpl)
        }

        // detectBugInROIs bugTemplateCache check
        const bugCanvas = await new Jimp(1000, 1000, 0xffffffff).getBufferAsync(Jimp.MIME_PNG)
        await detectBugInROIs([bugCanvas], [{ x: 335, y: 841, w: 104, h: 70, floorIndex: 0 }], ['ong-vang'])
        assert(getTemplateCacheStats().bugTemplates >= 1, 'detectBugInROIs should populate bugTemplateCache')
        await detectBugInROIs([bugCanvas], [{ x: 335, y: 841, w: 104, h: 70, floorIndex: 0 }], ['ong-vang'])
        invalidateTemplateCache()
        console.log('  -> PASSED: sellEventItems(isAds=true), mtime reload & bugTemplateCache passed.\n')

        // --- Test 30: testMatchCoordinates on synthetic 1000x1000 screen ---
        console.log('Test 30: testMatchCoordinates returns exact match coordinates & score...')
        resetAll()
        const gemImg = await Jimp.read(srcGem)
        const canvas = new Jimp(1000, 1000, 0x202020ff)
        canvas.composite(gemImg, 200, 300)
        const canvasBuf = await canvas.getBufferAsync(Jimp.MIME_PNG)
        const matchRes = await testMatchCoordinates(canvasBuf, srcGem, null, 0.85)
        assert(matchRes.bestScore >= 0.9, `Expected bestScore >= 0.9, got ${matchRes.bestScore}`)
        assert(matchRes.matches.length >= 1, 'Expected at least 1 match')
        assert(Math.abs(matchRes.matches[0].x - 20) <= 1, `Expected x ~ 20%, got ${matchRes.matches[0].x}`)
        assert(Math.abs(matchRes.matches[0].y - 30) <= 1, `Expected y ~ 30%, got ${matchRes.matches[0].y}`)
        invalidateTemplateCache()
        console.log('  -> PASSED: testMatchCoordinates located template cleanly.\n')

        // --- Test 31: Scheduler CRUD & evaluateDueSchedules ---
        console.log('Test 31: Scheduler & Playlist CRUD + due evaluation...')
        const plSaved = savePlaylist({
            name: 'Chuoi test',
            deviceIds: ['127.0.0.1:5555', 'bad; cmd'],
            steps: [
                { autoKey: 'bat-ong', maxLoops: 5, durationMinutes: 0 },
                { autoKey: 'bantra', maxLoops: 0, durationMinutes: 60 },
            ],
        })
        assert.strictEqual(plSaved.playlists.length, 1)
        assert.deepStrictEqual(plSaved.playlist.deviceIds, ['127.0.0.1:5555'])

        const schSaved = saveSchedule({
            name: 'Chay dem',
            time: '23:15',
            action: 'startPlaylist',
            targetId: plSaved.playlist.id,
            enabled: true,
        })
        assert.strictEqual(schSaved.schedules.length, 1)

        const mockDate = new Date(2026, 10, 24, 23, 15, 0)
        const due1 = evaluateDueSchedules(mockDate, getSchedulerData())
        assert.strictEqual(due1.length, 1)
        saveSchedule({ ...schSaved.schedule, lastTriggeredDate: '2026-11-24' })
        // Note: saveSchedule preserves existing lastTriggeredDate; simulate same-day deduplication directly
        const sameDayData = getSchedulerData()
        sameDayData.schedules[0].lastTriggeredDate = '2026-11-24'
        const due2 = evaluateDueSchedules(mockDate, sameDayData)
        assert.strictEqual(due2.length, 0, 'Same-day triggered schedule must not fire twice')

        deleteSchedule(schSaved.schedule.id)
        deletePlaylist(plSaved.playlist.id)
        assert.strictEqual(getSchedulerData().schedules.length, 0)
        assert.strictEqual(getSchedulerData().playlists.length, 0)
        console.log('  -> PASSED: Scheduler CRUD and daily deduplication passed.\n')

        // --- Test 32: Stats tracking & Backup/Restore path safety ---
        console.log('Test 32: Stats service & Backup/Restore path traversal protection...')
        resetStats()
        recordLoop('d1')
        recordLoop('d1')
        recordBugCaught('ong-vang', 3)
        recordRestart('game')
        recordRestart('watchdog')
        recordOcr('d1', '1', '45 100 60 100 30 100')
        const st = getStats()
        assert.strictEqual(st.today.loopsCompleted, 2)
        assert.strictEqual(st.today.bugsCaught['ong-vang'], 3)
        assert.strictEqual(st.today.restarts, 1)
        assert.strictEqual(st.today.recoveries, 1)
        assert.strictEqual(st.today.ocrHistory.length, 1)

        let restoreRes = null
        const validImgB64 = (await new Jimp(10, 10, 0xff0000ff).getBufferAsync(Jimp.MIME_PNG)).toString('base64')
        restoreBackup(
            {
                body: {
                    files: {
                        'profiles.json': [{ id: 'p1', name: 'Test' }],
                        '../evil.json': { bad: true },
                    },
                    autoScripts: {
                        'safe-script': 'module.exports = async () => {}',
                        '../../evil': 'bad()',
                    },
                    customImages: {
                        'safe-img': validImgB64,
                        '../bad-img': validImgB64,
                    },
                },
            },
            {
                status: () => ({ json: (d) => { restoreRes = d } }),
                json: (d) => { restoreRes = d },
            }
        )
        assert.strictEqual(restoreRes.success, true)
        assert.deepStrictEqual(restoreRes.restored.files, ['profiles.json'])
        assert.deepStrictEqual(restoreRes.skipped.files, ['../evil.json'])
        assert.deepStrictEqual(restoreRes.restored.autoScripts, ['safe-script'])
        assert.deepStrictEqual(restoreRes.skipped.autoScripts, ['../../evil'])
        assert.deepStrictEqual(restoreRes.restored.customImages, ['safe-img'])
        assert.deepStrictEqual(restoreRes.skipped.customImages, ['../bad-img'])
        assert.strictEqual(fs.existsSync(path.join(process.env.BACKUP_DATA_DIR, 'profiles.json')), true)
        assert.strictEqual(fs.existsSync(path.join(tempBackupRoot, 'evil.json')), false)

        let exported = null
        exportBackup({}, { json: (d) => { exported = d }, status: () => ({ json: (d) => { exported = d } }) })
        assert(exported && exported.files['profiles.json'].length === 1, 'exportBackup should read restored profiles.json')
        console.log('  -> PASSED: Stats tracking and Backup/Restore safety passed.\n')

        // --- Test 33: Feedback service (Discord, Telegram, Relay, Sanitization & Cooldown) ---
        console.log('Test 33: Feedback service config, secret masking, delivery & cooldown...')
        resetFeedbackCooldowns()
        delete process.env.FEEDBACK_DISCORD_WEBHOOK
        delete process.env.FEEDBACK_TELEGRAM_BOT_TOKEN
        delete process.env.FEEDBACK_TELEGRAM_CHAT_ID
        delete process.env.FEEDBACK_RELAY_URL

        const defaultFbStatus = getFeedbackStatus()
        assert.strictEqual(defaultFbStatus.configured, true, 'Default Cloudflare Worker relay should be enabled out-of-the-box')
        assert(defaultFbStatus.channels.includes('relay'))
        assert(!JSON.stringify(defaultFbStatus).includes('workers.dev'), 'Status must never expose relay URL')

        process.env.FEEDBACK_RELAY_URL = ''
        assert.strictEqual(getFeedbackStatus().configured, false)
        const unconfiguredRes = await submitFeedback({
            type: 'bug',
            title: 'Test unconfigured error',
            description: 'Mo ta chi tiet hop le hon 5 ky tu',
        })
        assert.strictEqual(unconfiguredRes.ok, false)
        assert.strictEqual(unconfiguredRes.statusCode, 503)
        assert.strictEqual(unconfiguredRes.code, 'FEEDBACK_NOT_CONFIGURED')
        delete process.env.FEEDBACK_RELAY_URL

        assert.throws(() => validateFeedbackPayload({ type: 'other', title: 'abc', description: '123456' }), (e) => e.statusCode === 400)
        assert.throws(() => validateFeedbackPayload({ type: 'bug', title: 'ab', description: '123456' }), (e) => e.statusCode === 400)
        assert.throws(
            () => validateFeedbackPayload({ type: 'bug', title: 'Loi ADB', description: 'Mo ta du dai', deviceId: '127.0.0.1;whoami' }),
            (e) => e.statusCode === 400
        )

        const masked = sanitizeSensitiveText(
            'Error posting https://discord.com/api/webhooks/12345/secretToken and https://api.telegram.org/bot99999:AAABBBCCC/sendMessage {"botToken":"hiddenSecret"}'
        )
        assert(!masked.includes('secretToken'), 'Discord webhook secret should be sanitized')
        assert(!masked.includes('AAABBBCCC'), 'Telegram token should be sanitized')
        assert(!masked.includes('hiddenSecret'), 'JSON botToken should be sanitized')

        const receivedFeedbackRequests = []
        const feedbackMockServer = http.createServer((req, res) => {
            const chunks = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => {
                const rawBuf = Buffer.concat(chunks)
                receivedFeedbackRequests.push({
                    url: req.url,
                    contentType: req.headers['content-type'] || '',
                    bodyStr: rawBuf.toString('utf8'),
                })
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true }))
            })
        })
        await new Promise((resolve) => feedbackMockServer.listen(0, '127.0.0.1', resolve))
        const fbPort = feedbackMockServer.address().port
        process.env.TELEGRAM_API_BASE = `http://127.0.0.1:${fbPort}`

        try {
            fs.writeFileSync(
                tempFeedbackConfigFile,
                JSON.stringify({
                    discordWebhookUrl: `http://127.0.0.1:${fbPort}/discord-hook`,
                    telegramBotToken: '123456:FAKE_TOKEN_XYZ',
                    telegramChatId: '-100999',
                    relayUrl: `http://127.0.0.1:${fbPort}/relay`,
                    cooldownSeconds: 30,
                }),
                'utf8'
            )
            fs.writeFileSync(
                tempFeedbackErrLogFile,
                '10:00:00 : Normal error line\n10:00:05 : Webhook failed https://discord.com/api/webhooks/111/verysecret\n',
                'utf8'
            )

            const fbStatus = getFeedbackStatus()
            assert.strictEqual(fbStatus.configured, true)
            assert.deepStrictEqual(fbStatus.channels, ['discord', 'telegram', 'relay'])
            assert(!JSON.stringify(fbStatus).includes('FAKE_TOKEN_XYZ'), 'getFeedbackStatus must never leak secrets')
            assert(!JSON.stringify(fbStatus).includes('discord-hook'), 'getFeedbackStatus must never leak URLs')

            const bugSend = await submitFeedback(
                {
                    type: 'bug',
                    title: 'Loi test gui bao cao',
                    category: 'Kẹt bán hàng / Treo đêm',
                    description: 'Mo ta loi chi tiet khi treo ban dem',
                    steps: '1. Mo auto\n2. Cho ban dem',
                    contact: '@tester',
                    deviceId: '127.0.0.1:5555',
                    includeLogs: true,
                    includeScreenshot: true,
                },
                {
                    errLogPath: tempFeedbackErrLogFile,
                    screenshotBuffer: Buffer.from('fake-screen-png'),
                }
            )
            assert.strictEqual(bugSend.ok, true)
            assert.strictEqual(bugSend.results.length, 3)
            assert(bugSend.results.every((r) => r.ok === true), 'All 3 mock channels should succeed')
            assert.strictEqual(receivedFeedbackRequests.length, 3)

            const discordReq = receivedFeedbackRequests.find((r) => r.url === '/discord-hook')
            const telegramReq = receivedFeedbackRequests.find((r) => r.url.includes('/sendPhoto'))
            const relayReq = receivedFeedbackRequests.find((r) => r.url === '/relay')
            assert(discordReq && discordReq.contentType.includes('multipart/form-data'))
            assert(telegramReq && telegramReq.contentType.includes('multipart/form-data'))
            assert(!discordReq.bodyStr.includes('verysecret'), 'Discord payload must mask leaked secrets in logs')
            assert(relayReq && JSON.parse(relayReq.bodyStr).screenshotBase64 === Buffer.from('fake-screen-png').toString('base64'))

            // Cooldown should block rapid duplicate bug type
            const bugCooldown = await submitFeedback({
                type: 'bug',
                title: 'Gui lan 2 qua nhanh',
                description: 'Mo ta hop le hon 5 ky tu',
            })
            assert.strictEqual(bugCooldown.ok, false)
            assert.strictEqual(bugCooldown.statusCode, 429)
            assert.strictEqual(bugCooldown.code, 'COOLDOWN')

            // Different type (suggestion) uses separate cooldown key and hits handler cleanly
            let apiStatus = 200
            let apiBody = null
            await submitFeedbackHandler(
                {
                    body: {
                        type: 'suggestion',
                        title: 'De xuat auto su kien moi',
                        category: 'Auto sự kiện mới',
                        description: 'Them buoc tu thu hoach va doi qua su kien',
                    },
                },
                {
                    status: (code) => {
                        apiStatus = code
                        return { json: (d) => { apiBody = d } }
                    },
                    json: (d) => { apiBody = d },
                }
            )
            assert.strictEqual(apiStatus, 200)
            assert.strictEqual(apiBody.ok, true)
        } finally {
            delete process.env.TELEGRAM_API_BASE
            delete process.env.FEEDBACK_RELAY_URL
            resetFeedbackCooldowns()
            await new Promise((resolve) => feedbackMockServer.close(resolve))
        }
        console.log('  -> PASSED: Feedback service config, masking, delivery & cooldown passed.\n')

        // --- Test 34: FAQ data handler, parseWmSize & tapDevicePoint validation ---
        console.log('Test 34: FAQ endpoint, parseWmSize & tapDevicePoint validation...')
        let faqData = null
        getFaqHandler({}, { json: (d) => { faqData = d } })
        assert(Array.isArray(faqData) && faqData.length >= 10, 'data/faq.json should contain at least 10 FAQ items')
        assert(faqData.every((item) => item.id && item.category && item.question && item.answer), 'Every FAQ item must have id/category/question/answer')

        assert.deepStrictEqual(parseWmSize('Physical size: 1080x1920\nOverride size: 720x1280\n'), { width: 720, height: 1280 })
        assert.deepStrictEqual(parseWmSize('Physical size: 900x1600\n'), { width: 900, height: 1600 })
        assert.strictEqual(parseWmSize(''), null)
        assert.strictEqual(parseWmSize('invalid output'), null)

        const invalidTapPayloads = [
            { deviceId: '', x: 50, y: 50 },
            { deviceId: '127.0.0.1;rm -rf', x: 50, y: 50 },
            { deviceId: '127.0.0.1:5555', x: -1, y: 50 },
            { deviceId: '127.0.0.1:5555', x: 50, y: 101 },
            { deviceId: '127.0.0.1:5555', x: 'abc', y: 50 },
        ]
        for (const badBody of invalidTapPayloads) {
            let tapStatus = 200
            let tapJson = null
            await tapDevicePoint(
                { body: badBody },
                {
                    status: (code) => {
                        tapStatus = code
                        return { json: (d) => { tapJson = d } }
                    },
                    json: (d) => { tapJson = d },
                }
            )
            assert.strictEqual(tapStatus, 400, `Expected HTTP 400 for invalid tap payload: ${JSON.stringify(badBody)}`)
            assert(tapJson && tapJson.error)
        }
        console.log('  -> PASSED: FAQ endpoint, parseWmSize & tapDevicePoint validation passed.\n')

        // --- Test 35: Activity Log per device & retention policies ---
        console.log('Test 35: ActivityLog sessions, level detection & retention pruning...')
        activityLog.clearDeviceHistory()
        activityLog.saveLogSettings({ retentionMode: 'days', retentionValue: 7 })

        const sA = activityLog.startSession({ deviceId: 'dev-a', game: 'sky-garden', autoName: 'trong-cay' })
        const sB = activityLog.startSession({ deviceId: 'dev-b', game: 'sky-garden', autoName: 'bat-ong' })
        activityLog.appendSessionLog('dev-a', 'Run 1 times\n[Watchdog] Khoi phuc\n[Lỗi vòng 2] Appium timeout\n', { sessionId: sA.id })
        activityLog.appendSessionLog('dev-b', 'Run 1 times\n', { sessionId: sB.id })
        activityLog.finishSession('dev-a', { sessionId: sA.id, status: 'finished', loopsCompleted: 3 })
        activityLog.finishSession('dev-b', { sessionId: sB.id, status: 'stopped', loopsCompleted: 1 })

        let histAll = null
        getActivityHistoryHandler({ query: {} }, { json: (d) => { histAll = d } })
        assert.strictEqual(histAll.sessions.length, 2)
        const savedA = histAll.sessions.find((s) => s.id === sA.id)
        assert.strictEqual(savedA.status, 'finished')
        assert.strictEqual(savedA.loopsCompleted, 3)
        assert.strictEqual(savedA.entries.length, 3)
        assert.strictEqual(savedA.entries[0].level, 'info')
        assert.strictEqual(savedA.entries[1].level, 'warn')
        assert.strictEqual(savedA.entries[2].level, 'error')

        // Prune by hours & days
        activityLog.saveLogSettings({ retentionMode: 'hours', retentionValue: 2 })
        assert.strictEqual(activityLog.pruneExpiredLogs(savedA.endedAt + 1 * 3600 * 1000), 0, 'Within 2 hours must remain')
        assert.strictEqual(activityLog.pruneExpiredLogs(savedA.endedAt + 3 * 3600 * 1000), 2, 'Over 2 hours must prune')

        const sDay = activityLog.startSession({ deviceId: 'dev-a', game: 'sky-garden', autoName: 'auto-dem' })
        const sRun = activityLog.startSession({ deviceId: 'dev-running', game: 'sky-garden', autoName: 'dang-chay' })
        activityLog.finishSession('dev-a', { sessionId: sDay.id, status: 'finished', loopsCompleted: 5 })
        activityLog.saveLogSettings({ retentionMode: 'days', retentionValue: 3 })
        assert.strictEqual(activityLog.pruneExpiredLogs(Date.now() + 2 * 86400 * 1000), 0)
        assert.strictEqual(activityLog.pruneExpiredLogs(Date.now() + 4 * 86400 * 1000), 1, 'Finished >3d pruned while running preserved')
        assert.strictEqual(activityLog.getActivityHistory().sessions.some((s) => s.id === sRun.id), true)

        // on_stop deletes session immediately when finished while keeping running session
        activityLog.saveLogSettings({ retentionMode: 'on_stop', retentionValue: 1 })
        const sStop = activityLog.startSession({ deviceId: 'dev-stop', game: 'sky-garden', autoName: 'tam-thoi' })
        activityLog.finishSession('dev-stop', { sessionId: sStop.id, status: 'finished', loopsCompleted: 1 })
        const histAfterStop = activityLog.getActivityHistory()
        assert.strictEqual(histAfterStop.sessions.some((s) => s.id === sStop.id), false, 'on_stop must delete session immediately on finish')
        assert.strictEqual(histAfterStop.sessions.some((s) => s.id === sRun.id), true, 'running session must stay alive')

        // never keeps sessions + clearDeviceHistory only deletes target device + deleteSessionById
        activityLog.saveLogSettings({ retentionMode: 'never', retentionValue: 1 })
        activityLog.finishSession('dev-running', { sessionId: sRun.id, status: 'stopped', loopsCompleted: 2 })
        const sDev1 = activityLog.startSession({ deviceId: 'dev-1', game: 'sky-garden', autoName: 'a1' })
        const sDev2 = activityLog.startSession({ deviceId: 'dev-2', game: 'sky-garden', autoName: 'a2' })
        activityLog.finishSession('dev-1', { sessionId: sDev1.id, status: 'finished', loopsCompleted: 1 })
        activityLog.finishSession('dev-2', { sessionId: sDev2.id, status: 'finished', loopsCompleted: 1 })
        assert.strictEqual(activityLog.pruneExpiredLogs(Date.now() + 500 * 86400 * 1000), 0)

        activityLog.clearDeviceHistory('dev-1')
        const afterClear1 = activityLog.getActivityHistory()
        assert.strictEqual(afterClear1.sessions.some((s) => s.deviceId === 'dev-1'), false)
        assert.strictEqual(afterClear1.sessions.some((s) => s.deviceId === 'dev-2'), true)

        assert.strictEqual(activityLog.deleteSessionById(sDev2.id).deleted, true)
        assert.strictEqual(activityLog.getActivityHistory().sessions.some((s) => s.id === sDev2.id), false)

        let badLogSettingsStatus = 200
        saveLogSettingsHandler(
            { body: { retentionMode: 'invalid_mode' } },
            { status: (c) => { badLogSettingsStatus = c; return { json: () => {} } }, json: () => {} }
        )
        assert.strictEqual(badLogSettingsStatus, 400)
        activityLog.clearDeviceHistory()
        console.log('  -> PASSED: ActivityLog sessions, level detection & retention pruning passed.\n')

        // --- Test 36: findCoordinates score sorting + sellItems non-compensated delays & sell logs ---
        console.log('Test 36: findCoordinates best-score sorting & sellItems delay preservation...')
        resetAll()
        invalidateTemplateCache()
        const exactGem = await Jimp.read(srcGem)
        const noisyGem = exactGem.clone()
        // Slightly alter a small corner of noisyGem so its score stays above 0.85 but below exactGem (~1.0)
        for (let py = 0; py < Math.min(6, noisyGem.bitmap.height); py++) {
            for (let px = 0; px < Math.min(6, noisyGem.bitmap.width); px++) {
                noisyGem.setPixelColor(0xffffffff, px, py)
            }
        }
        const multiCanvas = new Jimp(1000, 1000, 0x202020ff)
        multiCanvas.composite(exactGem, 150, 200)
        multiCanvas.composite(noisyGem, 600, 700)
        const multiBuf = await multiCanvas.getBufferAsync(Jimp.MIME_PNG)
        const rankedPoints = await findCoordinates(multiBuf, srcGem, null, 0.85)
        assert(rankedPoints.length >= 2, `Expected >=2 matches, got ${rankedPoints.length}`)
        const bestPt = rankedPoints[rankedPoints.length - 1]
        const exactCenterX = ((150 + exactGem.bitmap.width / 2) / 1000) * 100
        const exactCenterY = ((200 + exactGem.bitmap.height / 2) / 1000) * 100
        assert(Math.abs(bestPt.x - exactCenterX) <= 1.0, `Expected best point near x=${exactCenterX}, got ${bestPt.x}`)
        assert(Math.abs(bestPt.y - exactCenterY) <= 1.0, `Expected best point near y=${exactCenterY}, got ${bestPt.y}`)
        invalidateTemplateCache()

        saveAll({
            'global.speedMultiplier': 1.5,
            'global.dynamicSleepCompensation': true,
            'sell.openShopDelay': 1.0,
            'sell.afterScrollToStartDelay': 1.5,
            'sell.emptySlotDelay': 0.6,
            'sell.selectSlotDelay': 0.5,
            'sell.collectMoneyDelay': 0.5,
            'scroll.delayBetweenSwipe': 0.2,
            'game.backToGameDelay': 0.1,
            'image.postTapDelay': 0,
        })
        const sellPausedMs = []
        const fastMockWd = {
            pause: async (ms) => {
                sellPausedMs.push(ms)
            },
            executeScript: async () => {},
            action: () => {
                const chain = {
                    move: () => chain,
                    down: () => chain,
                    pause: () => chain,
                    up: () => chain,
                    perform: async () => {},
                }
                return chain
            },
            getWindowSize: async () => ({ width: 1280, height: 720 }),
        }
        const sellDriver = new Driver(fastMockWd, 'test-sell-guard')
        sellDriver.width = 1280
        sellDriver.height = 720

        // Repeated slow swipes at 1.5x must cap accumulatedDelay at 5000ms instead of growing unboundedly
        for (let k = 0; k < 10; k++) {
            await sellDriver.action([
                { duration: 0, x: 74.4, y: 54.9 },
                { duration: 3000, x: 23.8, y: 54.9 },
            ])
        }
        assert.strictEqual(sellDriver.accumulatedDelay, 5000, `accumulatedDelay must cap at 5000ms (got ${sellDriver.accumulatedDelay})`)

        const sellLogged = []
        sellDriver.appendLog = (msg) => sellLogged.push(msg)
        sellDriver.getCoordinateItemOnScreen = async (itemPath) => {
            if (itemPath && itemPath.includes('o-trong-ban')) return { x: 30, y: 43.5 }
            return null
        }
        sellDriver.tapItemOnScreen = async () => {
            sellDriver.lastTappedPoint = { x: 18.5, y: 48.2 }
            return true
        }
        sellDriver.haveItemOnScreen = async () => false
        sellDriver.isStopped = () => false

        await core.sellItems(
            sellDriver,
            SellItemOptions.tree,
            [{ key: 'p-tra', value: 1 }],
            { value: 0 },
            { value: 0 },
            false,
            true,
            false,
            true
        )
        assert(sellPausedMs.includes(1500), `Expected 1500ms afterScrollToStartDelay preserved, got ${JSON.stringify(sellPausedMs)}`)
        assert(sellPausedMs.includes(600), `Expected 600ms emptySlotDelay preserved, got ${JSON.stringify(sellPausedMs)}`)
        assert(sellPausedMs.includes(500), `Expected 500ms selectSlotDelay & backToGame preserved, got ${JSON.stringify(sellPausedMs)}`)
        assert(sellPausedMs.includes(200), `Expected 200ms _sell delay preserved, got ${JSON.stringify(sellPausedMs)}`)
        assert(sellPausedMs.includes(100), `Expected 100ms backToGame delay preserved, got ${JSON.stringify(sellPausedMs)}`)
        assert.strictEqual(sellDriver.accumulatedDelay, 0, `Expected sellItems to reset accumulatedDelay to 0 on exit (got ${sellDriver.accumulatedDelay})`)
        assert(sellLogged.some((line) => line.includes('p-tra') && line.includes('18.5%')), 'Expected sell log with itemId and tapped coord')

        // Check goUp, goDown, goDownLast stay completely fixed (unscaled swipe speed & fixed delays, no compensation deduction) at 1.5x
        saveAll({
            'global.speedMultiplier': 1.5,
            'global.dynamicSleepCompensation': true,
            'scroll.swipeSpeed': 0,
            'scroll.delayBetweenSwipe': 0.1,
            'scroll.delayAfterScroll': 0.3,
            'scroll.goDownLastMinSleep': 0.6,
            'scroll.goDownLastMaxSleep': 1.5,
            'scroll.goDownLastPerFloor': 0.1,
        })
        const scrollPausedMs = []
        const scrollSwipeArgs = []
        const scrollDriver = new Driver(
            {
                ...fastMockWd,
                pause: async (ms) => scrollPausedMs.push(ms),
                executeScript: async (script, args) => {
                    if (script === 'mobile:swipeGesture' && Array.isArray(args) && args[0]) {
                        scrollSwipeArgs.push(args[0])
                    }
                },
            },
            'test-scroll-fixed'
        )
        scrollDriver.width = 1280
        scrollDriver.height = 720
        scrollDriver.accumulatedDelay = 5000
        await core.goUp(scrollDriver, 1)
        await core.goDown(scrollDriver, 1)
        scrollDriver.currentFloor = 0
        await core.goDownLast(scrollDriver)
        assert(scrollSwipeArgs.length > 0 && scrollSwipeArgs.every((arg) => arg.speed === undefined), `Expected goUp/goDown/goDownLast swipes to omit speed (fixed unscaled), got ${JSON.stringify(scrollSwipeArgs)}`)
        assert(scrollPausedMs.includes(100), `Expected fixed 0.1s = 100ms in goUp/goDown/goDownLast, got ${JSON.stringify(scrollPausedMs)}`)
        assert(scrollPausedMs.includes(300), `Expected fixed 0.3s = 300ms in goUp/goDown/goDownLast, got ${JSON.stringify(scrollPausedMs)}`)
        assert(scrollPausedMs.includes(600), `Expected fixed 0.6s = 600ms in goDownLast, got ${JSON.stringify(scrollPausedMs)}`)
        assert(!scrollPausedMs.includes(150) && !scrollPausedMs.includes(450) && !scrollPausedMs.includes(900), `Expected fixed unscaled delays (not 1.5x scaled), got ${JSON.stringify(scrollPausedMs)}`)
        assert(!scrollPausedMs.includes(0), `Scroll/floor delays must never be deducted to 0ms, got ${JSON.stringify(scrollPausedMs)}`)
        assert.strictEqual(scrollDriver.accumulatedDelay, 5000, `Expected goUp/goDown/goDownLast not to increase or consume accumulatedDelay (got ${scrollDriver.accumulatedDelay})`)
        console.log('  -> PASSED: findCoordinates best-score sorting & sellItems/fixed-scroll delay preservation passed.\n')

        console.log('=====================================================')
        console.log('ALL TESTS PASSED SUCCESSFULLY! (36/36 test suites)')
        console.log('=====================================================')
    } finally {
        resetAll()
        if (fs.existsSync(tempParamsFile)) fs.unlinkSync(tempParamsFile)
        if (fs.existsSync(tempProfilesFile)) fs.unlinkSync(tempProfilesFile)
        if (fs.existsSync(tempNotifyFile)) fs.unlinkSync(tempNotifyFile)
        if (fs.existsSync(tempSchedulerFile)) fs.unlinkSync(tempSchedulerFile)
        if (fs.existsSync(tempStatsFile)) fs.unlinkSync(tempStatsFile)
        if (fs.existsSync(tempFeedbackConfigFile)) fs.unlinkSync(tempFeedbackConfigFile)
        if (fs.existsSync(tempFeedbackErrLogFile)) fs.unlinkSync(tempFeedbackErrLogFile)
        if (fs.existsSync(tempActivityLogFile)) fs.unlinkSync(tempActivityLogFile)
        if (fs.existsSync(tempBackupRoot)) fs.rmSync(tempBackupRoot, { recursive: true, force: true })
        console.log('\nCleaned up all isolated temp test files & directories.')
    }
}

runTests().catch((err) => {
    console.error('Test suite failed:', err)
    process.exit(1)
})
