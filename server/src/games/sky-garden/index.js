const core = require('./core')
const { SellItemOptions, OtherKeys } = require('./const')

const openGame = async (driver, gameOptions = {}, index, loopIndex = 0) => {
    const { openGame, noRestartIfOpen, noRestartPeriodic } = gameOptions
    const needOpen = openGame && index == 0
    if (needOpen) {
        let skipRestart = false
        if (loopIndex === 0) {
            if (noRestartIfOpen && (await core.haveshoponscreen(driver))) {
                skipRestart = true
            }
        } else {
            if (noRestartPeriodic && (await core.haveshoponscreen(driver))) {
                skipRestart = true
            }
        }

        if (skipRestart) {
            await driver.setCurrentWindowSize()
        } else {
            await core.openGame(driver)
        }
    } else {
        await driver.setCurrentWindowSize()
    }
    if (index != 0 && !(await core.haveshoponscreen(driver))) {
        await core.openGame(driver)
    }
}

const openChests = async (driver, gameOptions = {}) => {
    const { openChests } = gameOptions
    openChests && (await core.openChests(driver))
}

const makeEvent = async (driver, index) => {
    const needMakeEvent = index % 30 == 0
    needMakeEvent && await core.makeEvents(driver)
}

const getAuto = (autoKey) => {
    try {
        const resolvedPath = require.resolve(`./auto/${autoKey}`)
        delete require.cache[resolvedPath]
        return require(resolvedPath)
    } catch (e) {
        return null
    }
}

const autoNangKho = async (driver, gameOptions = {}, loopIndex = 0) => {
    const { kho1, kho2, khoFrequency = 1, sellOtherKho } = gameOptions;

    // Check chẵn chu kỳ nhảy. Vòng index = 0 luôn luôn chạy. 
    // Các vòng sau chỉ chạy nếu loopIndex chia hết cho khoFrequency.
    if (loopIndex % khoFrequency !== 0) return;

    let sellList = [];

    if (kho1) {
        // Lấy tự động mảng OCR trả về
        const kho1String = await core.readNumbersAndSave(driver, '1')
        const arr = kho1String.split(' ').map(Number)

        // Cấu trúc chuẩn 6 số: Gạch(0,1), Sơn Đỏ(2,3), Gỗ(4,5)
        if (arr.length >= 6) {
            const gach = arr[0], maxGach = arr[1];
            const sondo = arr[2], maxSondo = arr[3];
            const go = arr[4], maxGo = arr[5];

            if (gach >= maxGach + 10) sellList.push({ key: OtherKeys.gach, value: Math.floor((gach - maxGach) / 10) });
            if (sondo >= maxSondo + 10) sellList.push({ key: OtherKeys.sondo, value: Math.floor((sondo - maxSondo) / 10) });
            if (go >= maxGo + 10) sellList.push({ key: OtherKeys.go, value: Math.floor((go - maxGo) / 10) });
        }

        // Bán chéo đồ rác của Kho 2 (Nếu người dùng tick Xả chéo và vắng mặt Kho 2)
        if (sellOtherKho && !kho2) {
            sellList.push({ key: OtherKeys.da, value: 20 });
            sellList.push({ key: OtherKeys.sonvang, value: 20 });
            sellList.push({ key: OtherKeys.dinh, value: 20 });
        }
    }
    if (kho2) {
        // Lấy tự động mảng OCR trả về
        const kho2String = await core.readNumbersAndSave(driver, '2')
        const arr = kho2String.split(' ').map(Number)

        // Cấu trúc chuẩn 6 số: Đá(0,1), Sơn Vàng(2,3), Đinh(4,5)
        if (arr.length >= 6) {
            const da = arr[0], maxDa = arr[1];
            const sonvang = arr[2], maxSonvang = arr[3];
            const dinh = arr[4], maxDinh = arr[5];

            if (da >= maxDa + 10) sellList.push({ key: OtherKeys.da, value: Math.floor((da - maxDa) / 10) });
            if (sonvang >= maxSonvang + 10) sellList.push({ key: OtherKeys.sonvang, value: Math.floor((sonvang - maxSonvang) / 10) });
            if (dinh >= maxDinh + 10) sellList.push({ key: OtherKeys.dinh, value: Math.floor((dinh - maxDinh) / 10) });
        }

        // Bán chéo đồ rác của Kho 1 (Nếu người dùng tick Xả chéo và vắng mặt Kho 1)
        if (sellOtherKho && !kho1) {
            sellList.push({ key: OtherKeys.gach, value: 20 });
            sellList.push({ key: OtherKeys.sondo, value: 20 });
            sellList.push({ key: OtherKeys.go, value: 20 });
        }
    }

    if (sellList.length > 0) {
        let mutex = { value: 0 };
        let mutex2 = { value: 0 };
        // Phân loại gian hàng: Other (Dành cho đồ Nâng Cấp Kho)
        await core.sellItems(driver, SellItemOptions.other, sellList, mutex, mutex2, false, true, true);
    }
}

module.exports = async (data, driver) => {
    const { gameOptions, index, loopIndex = 0 } = data
    const { runAuto } = gameOptions

    await openGame(driver, gameOptions, index, loopIndex)
    await openChests(driver, gameOptions)
    await autoNangKho(driver, gameOptions, loopIndex)
    var auto = getAuto(runAuto)
    auto && (await auto(driver, gameOptions))
    await makeEvent(driver, index)
}
