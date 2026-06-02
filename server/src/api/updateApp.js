const { exec } = require('child_process')
const path = require('path')

function updateApp(req, res) {
    const projectRoot = path.resolve(__dirname, '../../../')

    // Run git pull to get latest code changes
    exec('git pull', { cwd: projectRoot }, (gitError, stdout, stderr) => {
        if (gitError) {
            console.error('Git pull failed:', stderr || gitError.message)
            return res.status(500).json({ error: 'Git pull failed: ' + (stderr || gitError.message) })
        }

        // Run webpack release build to compile new assets
        exec('npm run release', { cwd: projectRoot }, (buildError, buildStdout, buildStderr) => {
            if (buildError) {
                console.error('Webpack build failed:', buildStderr || buildError.message)
                return res.status(500).json({ error: 'Build failed: ' + (buildStderr || buildError.message) })
            }

            res.json({
                success: true,
                message: 'Cập nhật thành công! Vui lòng tải lại trang (nhấn F5) để tải phiên bản mới.'
            })
        })
    })
}

module.exports = {
    updateApp
}
