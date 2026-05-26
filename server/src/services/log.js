const { appendFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve, dirname } = require('path')
const moment = require('moment')

const errFilePath = resolve(__dirname, '../../../log/err.txt')
const infoFilePath = resolve(__dirname, '../../../log/info.txt')

// Tu dong tao thu muc log neu chua co
const logDir = dirname(errFilePath)
if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
}

function logErrMsg(msg) {
    appendFileSync(errFilePath, moment().format('LTS') + ' : ')
    appendFileSync(errFilePath, msg)
    appendFileSync(errFilePath, '\n')
}

function logInfoMsg(msg) {
    appendFileSync(infoFilePath, moment().format('LTS') + ' : ')
    appendFileSync(infoFilePath, msg)
    appendFileSync(infoFilePath, '\n')
}

function clearErrMsg() {
    writeFileSync(errFilePath, '')
}

function clearInfoMsg() {
    writeFileSync(infoFilePath, '')
}

module.exports = {
    logErrMsg,
    logInfoMsg,
    clearErrMsg,
    clearInfoMsg,
}
