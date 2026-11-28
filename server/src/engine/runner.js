const moment = require('moment');
const { logErrMsg } = require('../services/log');
const { connectAppium } = require('./webdriverio');
const { writeLogData, getLogData, getDeviceData, writeDeviceData } = require('../services/data');
const { ADBHelper } = require('./adb');
const { P } = require('../services/params');
const statusBus = require('../services/statusBus');
const { sendAlert } = require('../services/notify');
const stats = require('../services/stats');
const activityLog = require('../services/activityLog');

const SESSION_LOST_REGEX = /invalid session id|session not created|no such session|ECONNREFUSED|ECONNRESET|socket hang up|instrumentation process is not running|cannot be proxied to UiAutomator2/i;

const isSessionLostError = (err) => {
    const msg = err && err.message ? err.message : String(err || '');
    return SESSION_LOST_REGEX.test(msg);
};

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
};

const appendDeviceLog = (deviceId, text, sessionId = null) => {
    try {
        const logData = getLogData();
        const idx = logData.findIndex(x => x.device === deviceId);
        if (idx !== -1) {
            logData[idx].logs += text;
            writeLogData(logData);
        }
    } catch (e) {
        logErrMsg(`Error appending log for ${deviceId}: ${e}`);
    }
    try {
        activityLog.appendSessionLog(deviceId, text, { sessionId });
    } catch (e) {
        logErrMsg(`Error appending activity log for ${deviceId}: ${e}`);
    }
    statusBus.appendLog(deviceId, text);
};

class Runner {
    constructor() {
        // Holds active sessions
        this.queue = [];
    }

    getAutoTool(gameKey) {
        const { listGameOption } = require('../services/data').getGamesData();
        if (listGameOption.some(x => x.key === gameKey && !x.disabled)) {
            return require(`../games/${gameKey}/index`);
        }
        return null;
    }

    isRunning(deviceId) {
        return this.queue.some(x => x.id === deviceId);
    }

    push(deviceId, argv) {
        this.queue.push({
            id: deviceId,
            params: argv,
            driver: null,
            isRunning: false,
            isPaused: false,
            stopAfterLoop: false,
            startedAt: null,
            lastActivityAt: Date.now(),
            consecutiveErrors: 0,
            recoveryCount: 0,
            loopIndex: 0,
        });
        return this;
    }

    pause(deviceId) {
        const entry = this.queue.find(x => x.id === deviceId);
        if (!entry) return false;
        entry.isPaused = true;
        appendDeviceLog(deviceId, `[Tạm dừng] Đã tạm dừng lúc ${moment().format('LTS')}\n`);
        statusBus.updateStatus(deviceId, {
            state: 'paused',
            isPaused: true,
            currentStep: 'Đang tạm dừng',
        });
        return true;
    }

    resume(deviceId) {
        const entry = this.queue.find(x => x.id === deviceId);
        if (!entry) return false;
        entry.isPaused = false;
        entry.lastActivityAt = Date.now();
        appendDeviceLog(deviceId, `[Tiếp tục] Tiếp tục chạy lúc ${moment().format('LTS')}\n`);
        statusBus.updateStatus(deviceId, {
            state: entry.stopAfterLoop ? 'stopping' : 'running',
            isPaused: false,
            currentStep: 'Tiếp tục chạy',
            lastActivityAt: entry.lastActivityAt,
        });
        return true;
    }

    stopGraceful(deviceId) {
        const entry = this.queue.find(x => x.id === deviceId);
        if (!entry) return false;
        entry.stopAfterLoop = true;
        entry.isPaused = false;
        appendDeviceLog(deviceId, `[Dừng mềm] Sẽ dừng sau khi hoàn tất vòng hiện tại (${moment().format('LTS')})\n`);
        statusBus.updateStatus(deviceId, {
            state: 'stopping',
            stopAfterLoop: true,
            isPaused: false,
            currentStep: 'Sẽ dừng sau vòng hiện tại',
        });
        return true;
    }

    attachDriverHooks(entry, driver, deviceId) {
        driver.isStopped = () => !this.queue.some(x => x.id === deviceId && x.isRunning);
        driver.waitIfPaused = async () => {
            while (
                entry.isRunning &&
                entry.isPaused &&
                !entry.stopAfterLoop &&
                this.queue.some(x => x.id === deviceId)
            ) {
                await new Promise(r => setTimeout(r, 400));
            }
        };
        driver.setStep = (step) => {
            entry.lastActivityAt = Date.now();
            statusBus.updateStatus(deviceId, {
                currentStep: String(step || ''),
                lastActivityAt: entry.lastActivityAt,
            });
        };
        driver.appendLog = (msg) => {
            if (!msg) return;
            const line = String(msg).endsWith('\n') ? String(msg) : `${msg}\n`;
            appendDeviceLog(deviceId, line, entry.activitySessionId);
        };
        const overrideSpeed = Number(entry.params?.gameOptions?.speedMultiplierOverride);
        if (!isNaN(overrideSpeed) && overrideSpeed >= 1) {
            driver.speedMultiplierOverride = Math.min(3, overrideSpeed);
        }
    }

    async run(deviceId) {
        const startIndex = this.queue.findIndex(x => x.id === deviceId);
        if (startIndex === -1) return this;

        const initialEntry = this.queue[startIndex];
        initialEntry.isRunning = true;
        initialEntry.startedAt = Date.now();
        initialEntry.lastActivityAt = Date.now();
        checkOcrRequirement(this.queue);

        let watchdogTimer = null;
        let completedIterations = 0;
        let finalStatus = 'finished';

        try {
            const { params } = initialEntry;
            const { frequency = 1 } = params.gameOptions || {};
            const autoLabel = Array.isArray(params.playlist) && params.playlist.length > 0
                ? `Playlist (${params.playlist.length} bước)`
                : (params.gameOptions?.runAuto || '');

            const actSession = activityLog.startSession({
                deviceId,
                game: params.selectedGame || '',
                autoName: autoLabel,
            });
            initialEntry.activitySessionId = actSession?.id || null;
            initialEntry.activityClosed = false;
            appendDeviceLog(
                deviceId,
                `[Bắt đầu] Game: ${params.selectedGame || '?'} | Auto: ${autoLabel || '?'} (${moment().format('LTS')})\n`,
                initialEntry.activitySessionId
            );

            statusBus.updateStatus(deviceId, {
                state: 'running',
                currentStep: 'Đang kết nối Appium...',
                loopIndex: 0,
                frequency,
                startedAt: initialEntry.startedAt,
                lastActivityAt: initialEntry.lastActivityAt,
                recoveryCount: 0,
                consecutiveErrors: 0,
                isPaused: false,
                stopAfterLoop: false,
            });

            // Initialize log
            let logData = getLogData();
            let logIndex = logData.findIndex(x => x.device === deviceId);
            if (logIndex < 0) {
                logData.push({ device: deviceId, logs: '' });
            } else {
                logData[logIndex].logs = '';
            }
            writeLogData(logData);

            // Check if Appium helper apps are already installed
            const hasSettings = await ADBHelper.isPackageInstalled(deviceId, 'io.appium.settings');
            const hasUiAutomator = await ADBHelper.isPackageInstalled(deviceId, 'io.appium.uiautomator2.server');
            const isAppiumInstalled = hasSettings && hasUiAutomator;

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

            let driver;
            try {
                driver = await connectAppium(capabilities);
            } catch (connErr) {
                appendDeviceLog(deviceId, `[Lỗi kết nối Appium] ${connErr.message}\n`);
                sendAlert('deviceOffline', {
                    deviceId,
                    title: 'Không thể kết nối thiết bị/Appium',
                    message: connErr.message,
                }).catch(() => {});
                throw connErr;
            }

            const connectIdx = this.queue.findIndex(x => x.id === deviceId);
            if (connectIdx === -1 || !this.queue[connectIdx].isRunning) {
                try {
                    await driver.finish();
                } catch (e) {
                    logErrMsg(`Error finishing stale driver for ${deviceId}: ${e}`);
                }
                return this;
            }
            const activeEntry = this.queue[connectIdx];
            this.attachDriverHooks(activeEntry, driver, deviceId);
            activeEntry.driver = driver;
            activeEntry.lastActivityAt = Date.now();

            // Watchdog idle timer
            watchdogTimer = setInterval(() => {
                if (!P('watchdog.enabled')) return;
                const entry = this.queue.find(x => x.id === deviceId && x.isRunning);
                if (!entry || entry.isPaused || !entry.driver) return;
                const maxIdleMin = Number(P('watchdog.maxIdleMinutes')) || 20;
                if (Date.now() - entry.lastActivityAt >= maxIdleMin * 60 * 1000) {
                    entry.lastActivityAt = Date.now();
                    appendDeviceLog(deviceId, `[Watchdog] Quá ${maxIdleMin} phút không phản hồi, ngắt session treo để tự khôi phục...\n`);
                    entry.driver.finish().catch(() => {});
                }
            }, 30000);
            if (typeof watchdogTimer.unref === 'function') {
                watchdogTimer.unref();
            }

            let abortedByWatchdog = false;
            const hasPlaylist = Array.isArray(params.playlist) && params.playlist.length > 0;
            let playlistIdx = 0;
            let stepLoopsDone = 0;
            let stepStartedAt = Date.now();

            for (let i = 0; i < frequency; i++) {
                const idx = this.queue.findIndex(x => x.id === deviceId);
                if (idx === -1 || !this.queue[idx].isRunning) break;
                const entry = this.queue[idx];

                if (entry.stopAfterLoop) break;
                await entry.driver.waitIfPaused();

                const postPauseIdx = this.queue.findIndex(x => x.id === deviceId);
                if (postPauseIdx === -1 || !this.queue[postPauseIdx].isRunning) break;
                if (entry.stopAfterLoop) break;
                if (entry.driver) entry.driver.accumulatedDelay = 0;

                let effectiveParams = params;
                let stepPrefix = '';
                if (hasPlaylist) {
                    const currentStepCfg = params.playlist[playlistIdx];
                    const exceededLoops = currentStepCfg.maxLoops > 0 && stepLoopsDone >= currentStepCfg.maxLoops;
                    const exceededTime = currentStepCfg.durationMinutes > 0 && Date.now() - stepStartedAt >= currentStepCfg.durationMinutes * 60 * 1000;
                    if (exceededLoops || exceededTime) {
                        if (params.playlist.length > 1) {
                            playlistIdx = (playlistIdx + 1) % params.playlist.length;
                            appendDeviceLog(deviceId, `[Playlist] Chuyển sang bước ${playlistIdx + 1}/${params.playlist.length}: ${params.playlist[playlistIdx].autoKey}\n`);
                        }
                        stepLoopsDone = 0;
                        stepStartedAt = Date.now();
                    }
                    const activeStep = params.playlist[playlistIdx];
                    effectiveParams = {
                        ...params,
                        gameOptions: {
                            ...(params.gameOptions || {}),
                            runAuto: activeStep.autoKey,
                        },
                    };
                    stepPrefix = `[Playlist ${playlistIdx + 1}/${params.playlist.length}: ${activeStep.autoKey}] `;
                }

                entry.loopIndex = i + 1;
                entry.lastActivityAt = Date.now();
                statusBus.updateStatus(deviceId, {
                    state: entry.stopAfterLoop ? 'stopping' : 'running',
                    loopIndex: i + 1,
                    frequency,
                    currentStep: `${stepPrefix}Đang chạy vòng ${i + 1}/${frequency}`,
                    lastActivityAt: entry.lastActivityAt,
                });

                appendDeviceLog(deviceId, `Run ${i + 1} times at ${moment().format('LTS')}\n`);

                try {
                    const tool = this.getAutoTool(effectiveParams.selectedGame);
                    const openGameFrequency = parseInt(effectiveParams.gameOptions.openGameFrequency, 10) || 50;
                    if (tool) await tool({ ...effectiveParams, index: i % openGameFrequency, loopIndex: i }, entry.driver);
                    if (hasPlaylist) stepLoopsDone++;
                    entry.consecutiveErrors = 0;
                    entry.lastActivityAt = Date.now();
                } catch (err) {
                    logErrMsg(`autoTool error (${deviceId}): ${err}`);
                    appendDeviceLog(deviceId, `[Lỗi vòng ${i + 1}] ${err.message || err}\n`);

                    const stillActive = this.queue.some(x => x.id === deviceId && x.isRunning);
                    if (!stillActive) break;

                    entry.consecutiveErrors++;
                    const maxErrors = Number(P('watchdog.maxConsecutiveErrors')) || 3;
                    const shouldRecover = P('watchdog.enabled') && (isSessionLostError(err) || entry.consecutiveErrors >= maxErrors);

                    if (shouldRecover) {
                        const maxRecoveries = Number(P('watchdog.maxRecoveries')) || 0;
                        if (maxRecoveries > 0 && entry.recoveryCount >= maxRecoveries) {
                            abortedByWatchdog = true;
                            appendDeviceLog(deviceId, `[Watchdog] Đã đạt giới hạn ${maxRecoveries} lần tự khôi phục, dừng phiên.\n`);
                            sendAlert('watchdogFailed', {
                                deviceId,
                                title: 'Watchdog đạt giới hạn phục hồi',
                                message: `Đã thử ${maxRecoveries} lần nhưng không ổn định: ${err.message || err}`,
                            }).catch(() => {});
                            break;
                        }

                        entry.recoveryCount++;
                        entry.consecutiveErrors = 0;
                        stats.recordRestart('watchdog');
                        statusBus.updateStatus(deviceId, {
                            state: 'recovering',
                            currentStep: `Watchdog đang khôi phục (lần ${entry.recoveryCount})...`,
                            recoveryCount: entry.recoveryCount,
                        });
                        appendDeviceLog(deviceId, `[Watchdog] Đang khôi phục session (lần ${entry.recoveryCount})...\n`);

                        if (entry.driver) {
                            try { await entry.driver.finish(); } catch (_) {}
                            entry.driver = null;
                        }

                        await new Promise(r => setTimeout(r, 3000));
                        if (!this.queue.some(x => x.id === deviceId && x.isRunning)) break;

                        try {
                            const newDriver = await connectAppium(capabilities);
                            if (!this.queue.some(x => x.id === deviceId && x.isRunning)) {
                                try { await newDriver.finish(); } catch (_) {}
                                break;
                            }
                            this.attachDriverHooks(entry, newDriver, deviceId);
                            entry.driver = newDriver;
                            entry.lastActivityAt = Date.now();

                            if (params.selectedGame === 'sky-garden') {
                                try {
                                    await require('../games/sky-garden/core').openGame(newDriver);
                                } catch (openErr) {
                                    logErrMsg(`Watchdog openGame error (${deviceId}): ${openErr}`);
                                }
                            }

                            appendDeviceLog(deviceId, `[Watchdog] Khôi phục session lần ${entry.recoveryCount} thành công!\n`);
                            statusBus.updateStatus(deviceId, {
                                state: entry.stopAfterLoop ? 'stopping' : 'running',
                                currentStep: `Đã khôi phục (lần ${entry.recoveryCount})`,
                                recoveryCount: entry.recoveryCount,
                            });
                            sendAlert('watchdogRecovered', {
                                deviceId,
                                title: 'Watchdog khôi phục thành công',
                                message: `Đã kết nối lại session Appium (lần ${entry.recoveryCount}).`,
                            }).catch(() => {});
                        } catch (recErr) {
                            logErrMsg(`Watchdog reconnect failed (${deviceId}): ${recErr}`);
                            appendDeviceLog(deviceId, `[Watchdog] Kết nối lại thất bại: ${recErr.message || recErr}\n`);
                            sendAlert('watchdogFailed', {
                                deviceId,
                                title: 'Watchdog kết nối lại thất bại',
                                message: recErr.message || String(recErr),
                            }).catch(() => {});
                            if (maxRecoveries > 0 && entry.recoveryCount >= maxRecoveries) {
                                abortedByWatchdog = true;
                                break;
                            }
                        }
                    }
                }

                // Stop recording
                try {
                    if (entry.driver) {
                        await entry.driver.stopRecordingScreen(i % 2);
                    }
                    completedIterations = i + 1;
                    stats.recordLoop(deviceId);
                    appendDeviceLog(deviceId, `Finished run ${i + 1} at ${moment().format('LTS')}\n`);
                } catch (err) {
                    logErrMsg(`stopRecordingScreen error: ${err}`);
                }

                if (entry.stopAfterLoop) {
                    appendDeviceLog(deviceId, `[Dừng mềm] Đã dừng sau khi hoàn tất vòng ${i + 1}.\n`);
                    break;
                }
            }

            if (abortedByWatchdog) {
                finalStatus = 'error';
            }

            if (this.queue.some(x => x.id === deviceId && x.isRunning)) {
                appendDeviceLog(deviceId, `Finish at ${moment().format('LTS')}\n`, initialEntry.activitySessionId);
                if (!abortedByWatchdog && !initialEntry.stopAfterLoop && completedIterations >= frequency) {
                    sendAlert('runFinished', {
                        deviceId,
                        title: 'Hoàn thành Auto',
                        message: `Đã hoàn tất ${completedIterations}/${frequency} vòng.`,
                    }).catch(() => {});
                }
            }
        } catch (err) {
            finalStatus = 'error';
            logErrMsg(`Runner error for ${deviceId}: ${err}`);
            appendDeviceLog(deviceId, `[Lỗi phiên chạy] ${err.message || err}\n`, initialEntry.activitySessionId);
        } finally {
            if (watchdogTimer) {
                clearInterval(watchdogTimer);
                watchdogTimer = null;
            }
            const endIdx = this.queue.findIndex(x => x.id === deviceId);
            if (!initialEntry.activityClosed) {
                initialEntry.activityClosed = true;
                const resolvedStatus = endIdx === -1
                    ? 'stopped'
                    : (initialEntry.stopAfterLoop && finalStatus === 'finished' ? 'stopped' : finalStatus);
                try {
                    activityLog.finishSession(deviceId, {
                        sessionId: initialEntry.activitySessionId,
                        status: resolvedStatus,
                        loopsCompleted: completedIterations,
                    });
                } catch (e) {
                    logErrMsg(`Error finishing activity log for ${deviceId}: ${e}`);
                }
            }
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
                try {
                    const remaining = getDeviceData().filter(x => x.device !== deviceId);
                    writeDeviceData(remaining);
                } catch (e) {
                    logErrMsg(`Error cleaning device data for ${deviceId}: ${e}`);
                }
            }
            statusBus.removeStatus(deviceId);
        }
        return this;
    }

    async kill(deviceId) {
        const idx = this.queue.findIndex(x => x.id === deviceId);
        if (idx !== -1) {
            const [entry] = this.queue.splice(idx, 1);
            entry.isRunning = false;
            if (!entry.activityClosed) {
                appendDeviceLog(
                    deviceId,
                    `[Dừng thủ công] Người dùng đã bấm Stop lúc ${moment().format('LTS')}\n`,
                    entry.activitySessionId
                );
                entry.activityClosed = true;
                try {
                    activityLog.finishSession(deviceId, {
                        sessionId: entry.activitySessionId,
                        status: 'stopped',
                        loopsCompleted: entry.loopIndex || 0,
                    });
                } catch (e) {
                    logErrMsg(`Error closing activity log on kill for ${deviceId}: ${e}`);
                }
            }
            if (entry.driver) {
                try {
                    await entry.driver.finish();
                } catch (e) {
                    logErrMsg(`Error finishing driver on kill for ${deviceId}: ${e}`);
                }
            }
            checkOcrRequirement(this.queue);
        }
        statusBus.removeStatus(deviceId);
        return this;
    }

    async killAll(listDeviceId) {
        for (const id of listDeviceId) {
            await this.kill(id);
        }
        return this;
    }
}

module.exports = { Runner, isSessionLostError };
