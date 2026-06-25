const moment = require('moment');
const { logErrMsg } = require('../services/log');
const { connectAppium } = require('./webdriverio');
const { writeLogData, getLogData } = require('../services/data');
const { ADBHelper } = require('./adb');

const checkOcrRequirement = (queue) => {
    try {
        const core = require('../games/sky-garden/core');
        const needOcr = queue.some(x => {
            if (!x.isRunning) return false;
            const params = x.params || {};
            const opts = params.gameOptions || {};
            return opts.kho1 || opts.kho2;
        });

        if (needOcr) {
            core.ensurePythonServer().catch((e) => { 
                logErrMsg(`Failed to ensure Python Server: ${e}`);
            });
        } else {
            core.shutdownPythonServer().catch((e) => { 
                logErrMsg(`Failed to shutdown Python Server: ${e}`);
            });
        }
    } catch (e) {
        logErrMsg(`Error checking OCR requirement: ${e}`);
    }
}

class Runner {
    constructor() {
        // Holds active sessions: { id, params, driver, isRunning }
        this.queue = [];
    }

    getAutoTool(gameKey) {
        const { listGameOption } = require('../services/data').getGamesData();
        if (listGameOption.some(x => x.key === gameKey && !x.disabled)) {
            return require(`../games/${gameKey}/index`);
        }
        return null;
    }

    push(deviceId, argv) {
        this.queue.push({ id: deviceId, params: argv, driver: null, isRunning: false });
        return this;
    }

    async run(deviceId) {
        // Find entry
        const startIndex = this.queue.findIndex(x => x.id === deviceId);
        if (startIndex === -1) return this;

        // Mark running
        this.queue[startIndex].isRunning = true;
        checkOcrRequirement(this.queue);
        const { params } = this.queue[startIndex];
        const { frequency } = params.gameOptions;
        const { quantity } = params.gameOptions;
        // Initialize log
        let logData = getLogData();
        let logIndex = logData.findIndex(x => x.device === deviceId);
        if (logIndex < 0) {
            logData.push({ device: deviceId, logs: '' });
            logIndex = logData.length - 1;
        } else {
            logData[logIndex].logs = '';
        }
        writeLogData(logData);

        // Check if Appium helper apps are already installed
        const hasSettings = await ADBHelper.isPackageInstalled(deviceId, 'io.appium.settings');
        const hasUiAutomator = await ADBHelper.isPackageInstalled(deviceId, 'io.appium.uiautomator2.server');
        const isAppiumInstalled = hasSettings && hasUiAutomator;

        // Appium capabilities
        const capabilities = {
            platformName: 'Android',
            'appium:options': {
                udid: deviceId,
                automationName: 'UiAutomator2',
                adbPort: parseInt(process.env.ANDROID_ADB_SERVER_PORT || '5037', 10),
                noReset: true,
                disableWindowAnimation: true,
                suppressKillServer: true,
                clearDeviceLogsOnStart: true,
                skipLogcatCapture: true,
                allowDelayAdb: false,
                newCommandTimeout: 0,
                autoGrantPermissions: true,
                ignoreUnimportantViews: true,
                disableAndroidWatchers: true,
                enforceAppInstall: false,
                skipDeviceInitialization: isAppiumInstalled,
                skipServerInstallation: isAppiumInstalled,
                sessionOverride: true,
                resetKeyboard: true,
                disableSuppressAccessibilityService: true,
                adbExecTimeout: 120000,
                androidInstallTimeout: 120000,
                enablePerformanceLogging: false,
                logLevel: 'error',
            },
        };

        try {
            // Start Appium session
            this.queue[startIndex].driver = await connectAppium(capabilities);

            // Main loop: each iteration fully awaited and checks queue state
            for (let i = 0; i < frequency; i++) {
                // Re-fetch entry to handle kills
                const idx = this.queue.findIndex(x => x.id === deviceId);
                if (idx === -1 || !this.queue[idx].isRunning) break;
                const entry = this.queue[idx];

                // Log iteration start
                logData = getLogData();
                const logIdx = logData.findIndex(x => x.device === deviceId);
                logData[logIdx].logs += `Run ${i + 1} times at ${moment().format('LTS')}\n`;
                writeLogData(logData);


                try {
                    const tool = this.getAutoTool(params.selectedGame);
                    if (tool) await tool({ ...params, index: i % 50, loopIndex: i }, entry.driver);
                } catch (err) {
                    logErrMsg(`autoTool error: ${err}`);
                }

                // Stop recording
                try {
                    await entry.driver.stopRecordingScreen(i % 2);
                    const doneLog = `Finished run ${i + 1} at ${moment().format('LTS')}\n`;
                    logData = getLogData();
                    logData[idx].logs += doneLog;
                    writeLogData(logData);
                } catch (err) {
                    logErrMsg(`stopRecordingScreen error: ${err}`);
                }
            }

            // Final log
            logData = getLogData();
            const finishIdx = logData.findIndex(x => x.device === deviceId);
            logData[finishIdx].logs += `Finish at ${moment().format('LTS')}\n`;
            writeLogData(logData);
        } catch (err) {
            logErrMsg(`Runner error for ${deviceId}: ${err}`);
        } finally {
            // Cleanup: close session and remove entry
            const endIdx = this.queue.findIndex(x => x.id === deviceId);
            if (endIdx !== -1) {
                const { driver } = this.queue[endIdx];
                if (driver) {
                    try {
                        await driver.finish();
                    } catch (e) {
                        logErrMsg(`Error finishing driver for ${deviceId}: ${e}`);
                    }
                }
                this.queue.splice(endIdx, 1);
                checkOcrRequirement(this.queue);
            }
        }
        return this;
    }

    async kill(deviceId) {
        // Remove entry immediately to stop the loop
        const idx = this.queue.findIndex(x => x.id === deviceId);
        if (idx !== -1) {
            const [entry] = this.queue.splice(idx, 1);
            if (entry.driver) {
                try {
                    await entry.driver.finish();
                } catch (e) {
                    logErrMsg(`Error finishing driver on kill for ${deviceId}: ${e}`);
                }
            }
            checkOcrRequirement(this.queue);
        }
        return this;
    }

    async killAll(listDeviceId) {
        for (const id of listDeviceId) {
            await this.kill(id);
        }
        return this;
    }
}

module.exports = { Runner };
