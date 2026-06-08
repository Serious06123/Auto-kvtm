const { spawn, exec } = require('child_process')
const { logErrMsg } = require('../services/log')
const Promise = require('bluebird')

function runExecAsync(command) {
    return new Promise((resolve, reject) => {
        runExec(
            command,
            (stdout) => resolve(stdout),
            (err) => {
                logErrMsg(err.message)
                reject(err)
            },
            (code, signal) => {
                if (code !== 0) {
                    reject(new Error(`process die with code ${code}, signal ${signal}`))
                }
            }
        )
    })
}

function runExec(command, outputHandler = null, errorHandler = null, exitHandler = null) {
    const childProcess = exec(command, (err, stdout, stderr) => {
        if (err) {
            errorHandler && errorHandler(err)
        }
        stderr && logErrMsg(stderr)
        outputHandler && outputHandler(stdout)
    })

    childProcess.on('close', function (code, signal) {
        exitHandler && exitHandler(code, signal)
    })

    return childProcess
}

function runSpawn(command, errorHandler = null, exitHandler = null) {
    let commandArray = command.match(/(?:[^\s"]+|"[^"]*")+/g) || []
    let cmd = commandArray.shift()
    if (cmd && cmd.startsWith('"') && cmd.endsWith('"')) {
        cmd = cmd.slice(1, -1)
    }
    const args = commandArray.map(arg => {
        if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg.slice(1, -1)
        }
        return arg
    })
    const childProcess = spawn(cmd, args)

    childProcess.stderr.on('data', function (data) {
        errorHandler ? errorHandler(data) : logErrMsg(data)
    })

    childProcess.on('close', function (code, signal) {
        exitHandler && exitHandler(code, signal)
    })

    return childProcess
}

module.exports = {
    runExec,
    runSpawn,
    runExecAsync,
}
