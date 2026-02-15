const { back } = require('appium-uiautomator2-driver/build/lib/commands/navigation')
const { KeyCode, SwipeDirection } = require('../../engine/webdriverio')
const {
    DelayTime,
    MakeSlotList,
    FirstRowSlotList,
    SecondRowSlotList,
    DefaultBasket,
    DefaultProduct,
    SellOptions,
    ItemKeys,
    SellItemOptions,
    SellSlotList,
    FriendHouseList,
    PlantSlotList,
    SlotPositions,
    ThirdRowSlotList,
    FourthRowSlotList,
    BugKeys,
    ProductTreeKeys,
    ProductMineralKeys,
    OtherKeys,
} = require('./const')

const { resolve } = require('path')
const { is } = require('bluebird')
const openGame = async (driver) => {
    await driver.press(KeyCode.HOME)
    await driver.closeApp(ItemKeys.gameId)
    await driver.openApp(ItemKeys.gameId)
    await driver.sleep(5)
    // reset current window size
    await driver.setCurrentWindowSize()

    let gamePosition = null
    let count = 0
    let tk = null
    await driver.tap(85.9, 91.9)
    while (!tk && count < 10) {
        tk = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.dangnhap), SlotPositions.p3p4)
        if (tk) {
            await driver.tap(tk.x, tk.y)
            await driver.sleep(1)
            break
        }
        await driver.tap(97.1, 97.1)
        await driver.sleep(1)
        await driver.tap(85.9, 91.9)
        count++
    }
    count = 0
    while (!gamePosition) {
        if (count > 20) break;
        await driver.tap(97.1, 97.1)
        await driver.sleep(1)
        await driver.tap(85.9, 91.9)

        gamePosition = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.game1), SlotPositions.p1p3)
        await driver.sleep(1)
        count++
    }
    count = 0;
    await driver.tap(gamePosition.x, gamePosition.y)
    await driver.sleep(15)

    // reset current window size
    await driver.setCurrentWindowSize()
    let kc = null
    for (let i = 0; i < 10; i++) {
        await driver.press(KeyCode.BACK)
        await driver.sleep(1)
    }

    await driver.tap(59.2, 62.5)
    await driver.sleep(1)
    while (!kc) {
        if (count > 5) return await openGame(driver);
        kc = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.shopGem), SlotPositions.p3p4)
        count++
    }
    count = 0
    await driver.tap(95.4, 71.7)
    await driver.sleep(1)
    await driver.press(KeyCode.BACK)
    await driver.sleep(1)
    await driver.tap(95.4, 64.0)
    await driver.sleep(1)
    await driver.press(KeyCode.BACK)
    await backToGame(driver)
}

const openChests = async (driver) => {
    await goDownLast(driver);
    let isFound = await driver.haveItemOnScreen(_getItemPath(ItemKeys.chest), SlotPositions.moruong)
    if (isFound) {
        await driver.tap(37.0, 62.7)
        await driver.sleep(0.2)
        await driver.tap(37.0, 62.7)
        await driver.sleep(0.5)
        await driver.tap(26.5, 63.0)
        await driver.sleep(0.2)
        await driver.tap(26.5, 63.0)
        await driver.sleep(0.5)
        for (let i = 0; i < 10; i++) {
            await driver.tap(50.0, 56.8)
            await driver.sleep(0.2)
        }
        //back to game
        await backToGame(driver)
    }
    else {
        isFound = await driver.haveItemOnScreen(_getItemPath(ItemKeys.chest1), SlotPositions.moruong)
        if (isFound) {
            await driver.tap(35.0, 54.7)
            await driver.sleep(0.2)
            await driver.tap(35.0, 54.7)
            await driver.sleep(0.5)
            await driver.tap(21.25, 65.0)
            await driver.sleep(0.2)
            await driver.tap(21.25, 65.0)
            await driver.sleep(0.5)
            for (let i = 0; i < 10; i++) {
                await driver.tap(50.0, 56.8)
                await driver.sleep(0.2)
            }
            //back to game
            await backToGame(driver)
        }

    }
    await backToGame(driver)
}

const backToGame = async (driver) => {
    await driver.press(KeyCode.BACK)
    await driver.sleep(0.1)
    await driver.press(KeyCode.BACK)
    await driver.sleep(0.1)
    await driver.press(KeyCode.BACK)
    await driver.sleep(0.1)
    await driver.press(KeyCode.BACK)
    await driver.sleep(0.1)
    await driver.press(KeyCode.BACK)
    await driver.sleep(0.1)
    await driver.tap(57.4, 61.9)
    await driver.sleep(0.5)
}

const goUp = async (driver, times = 1) => {
    for (let i = 0; i < times; i++) {
        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 60 }, SwipeDirection.DOWN)
        await driver.sleep(0.1)
    }
    await driver.sleep(0.3)
}

const goDown = async (driver, times = 1) => {
    for (let i = 0; i < times; i++) {
        await driver.swipe({ x: 50, y: 50 }, { x: 50, y: 40 }, SwipeDirection.UP)
        await driver.sleep(0.1)
    }
    await driver.sleep(0.3)
}

const goDownLast = async (driver) => {
    await goDown(driver)
    await goUp(driver, 2)
    await driver.tap(50.63, 97.78)
    await driver.sleep(1)
}

const harvestTrees = async (driver, mutex, floor = 4, pot = 5, sukien = false) => {
    if (mutex.value >= 1) {
        return;
    }
    const { x, y } = DefaultBasket
    const pointList = [{ duration: 0, x: x, y: y }]
    const duration = 25

    for (let i = 0; i < FirstRowSlotList.length && floor >= 1; i++) {
        if (i > pot && floor == 1) break
        pointList.push({
            duration,
            x: FirstRowSlotList[i].x,
            y: FirstRowSlotList[i].y,
        })
    }
    // 2 3
    // floor 2
    for (let i = 0; i < SecondRowSlotList.length && floor >= 2; i++) {
        pointList.push({
            duration,
            x: SecondRowSlotList[i].x,
            y: SecondRowSlotList[i].y,
        })
        if (i >= pot && floor == 2) break
    }
    for (let i = 0; i < ThirdRowSlotList.length && floor >= 3; i++) {
        pointList.push({
            duration,
            x: ThirdRowSlotList[i].x,
            y: ThirdRowSlotList[i].y,
        })
        if (i >= pot && floor == 3) break
    }
    for (let i = 0; i < FourthRowSlotList.length && floor >= 4; i++) {
        pointList.push({
            duration,
            x: FourthRowSlotList[i].x,
            y: FourthRowSlotList[i].y,
        })
        if (i >= pot && floor == 4) break
    }
    await driver.tap(36.8, 91.3)
    await driver.sleep(0.1)
    let count = 0
    while (!(await driver.haveItemOnScreen(_getItemPath(ItemKeys.harvestBasket), SlotPositions.thuhoach))) {
        if (count > 10) {
            await backToGame(driver)
            if (!(await haveshoponscreen(driver))) {
                await openGame(driver)
                mutex.value = 1;
                return
            }
            break;
        }
        await driver.tap(36.8, 91.3)
        await driver.sleep(0.1)
        count++
    }
    if (count <= 10) {
        await driver.action(pointList)
        if (!sukien) await backToGame(driver)
    }
}


const findbugonfloor = async (driver, BugKeys) => {
    await goFriendHouse(driver, 0);
    await driver.sleep(1)
    for (let i = 0; i < 10; i++) {
        let count = 0;
        let findbug = null;
        await goUp(driver)
        await driver.sleep(1)
        while (count < 5 && !findbug) {
            findbug = await driver.getCoordinateItemOnScreen(_getItemPath(BugKeys), SlotPositions.batbo)
            count++;
        }
        if (!findbug) {
            continue
        }
        findbug = _getSlotNearest(findbug)
        await driver.tap(findbug.x, findbug.y);
        let votxanh = await driver.haveItemOnScreen(_getItemPath(ItemKeys.votxanh), SlotPositions.p3p4)
        const pointList = [{ duration: 0, x: votxanh.x, y: votxanh.y }]
        const duration = 200 * DelayTime
        if (!votxanh) {
            pointList.push({
                duration,
                x: findbug.x,
                y: findbug.y,
            })
        }
        await driver.sleep(0.5)
        await driver.action(pointList)
    }
    await goFriendHouse(driver, 1)
    await driver.sleep(1)
    await goUp(driver, 2)
    await driver.sleep(0.5)
    await goMyHouse(driver)
}

const getPotNearest = async (driver, BugKeys) => {
    await goFriendHouse(driver, 0);
    await driver.sleep(1)
    for (let i = 0; i < 10; i++) {
        let count = 0;
        let findbug = null;
        await goUp(driver)
        await driver.sleep(1)
        while (count < 20 && !findbug) {
            findbug = await driver.getCoordinateItemOnScreen(_getItemPath(BugKeys), SlotPositions.batbo)
            count++;
        }
        if (!findbug) {
            continue
        }
        findbug = await _getSlotNearest(findbug)
        await driver.tap(findbug.x, findbug.y);
        let votxanh = await driver.haveItemOnScreen(_getItemPath(ItemKeys.votxanh), SlotPositions.p3p4)
        const pointList = [{ duration: 0, x: votxanh.x, y: votxanh.y }]
        const duration = 200 * DelayTime
        if (!votxanh) {
            pointList.push({
                duration,
                x: findbug.x,
                y: findbug.y,
            })
        }
        await driver.sleep(0.5)
        await driver.action(pointList)
    }
    await goFriendHouse(driver, 1)
    await driver.sleep(1)
    await goUp(driver, 2)
    await driver.sleep(0.5)
    await goMyHouse(driver)
}
const findTreeOnScreen = async (driver, treeKey, isFindNext = true) => {
    let slotItem = await driver.getCoordinateItemOnScreen(_getItemPath(treeKey), SlotPositions.caytrong)
    let retryCount = 0
    while (!slotItem && retryCount++ < 5) {
        isFindNext ? await driver.tap(42.2, 85.2) : await driver.tap(16.5, 84.3)
        await driver.sleep(0.2)
        slotItem = await driver.getCoordinateItemOnScreen(_getItemPath(treeKey), SlotPositions.caytrong)
    }
    return slotItem
}
const plantTrees = async (driver, mutex, treeKey, floor = 4, pot = 5, isFindNext = true, sukien = false) => {
    if (mutex.value >= 1) return;
    await driver.tap(36.8, 91.3)
    await driver.sleep(0.1)
    let slotTree = await findTreeOnScreen(driver, treeKey, isFindNext)
    if (!slotTree) {
        if (!(await haveshoponscreen(driver))) {
            await openGame(driver)
            mutex.value = 1;
            return
        }
        await harvestTrees(driver, mutex)
        await driver.sleep(0.5)
        await driver.tap(36.8, 91.3)
        await driver.sleep(0.1)
        slotTree = await findTreeOnScreen(driver, treeKey, isFindNext)
        if (!slotTree) {
            await backToGame(driver)
            return
        }
    }
    const pointList = [{ duration: 0, x: slotTree.x, y: slotTree.y }]
    const duration = 25
    // floor 1
    for (let i = 0; i < FirstRowSlotList.length && floor >= 1; i++) {
        if (i > pot && floor == 1) break
        pointList.push({
            duration,
            x: FirstRowSlotList[i].x,
            y: FirstRowSlotList[i].y,
        })
    }
    // 2 3
    // floor 2
    for (let i = 0; i < SecondRowSlotList.length && floor >= 2; i++) {
        pointList.push({
            duration,
            x: SecondRowSlotList[i].x,
            y: SecondRowSlotList[i].y,
        })
        if (i >= pot && floor == 2) break
    }
    for (let i = 0; i < ThirdRowSlotList.length && floor >= 3; i++) {
        pointList.push({
            duration,
            x: ThirdRowSlotList[i].x,
            y: ThirdRowSlotList[i].y,
        })
        if (i >= pot && floor == 3) break
    }
    for (let i = 0; i < FourthRowSlotList.length && floor >= 4; i++) {
        pointList.push({
            duration,
            x: FourthRowSlotList[i].x,
            y: FourthRowSlotList[i].y,
        })
        if (i >= pot && floor == 4) break
    }

    await driver.sleep(0.1)
    await driver.action(pointList)
    if (!sukien) {
        await backToGame(driver)
    }
}
const makeItems = async (driver, floor = 1, slot = 0, number = 1, mutex) => {
    if (mutex.value >= 1) {
        return;
    }
    const position = { x: 26.3, y: floor === 1 ? 93.6 : 67.3 };

    for (let i = 0; i < 12; i++) {
        await driver.tap(position.x, position.y);
        await driver.sleep(0.1);
    }

    let count = 0;
    while (!(await driver.haveItemOnScreen(_getItemPath(ItemKeys.emptyProductionSlot), SlotPositions.p3))) {
        await driver.tap(position.x, position.y)
        await driver.sleep(0.1)
        count++
        if (count > 10) {
            await backToGame(driver)
            await driver.tap(position.x, position.y)
            await driver.sleep(0.1)
            if ((await driver.haveItemOnScreen(_getItemPath(ItemKeys.fullkho), SlotPositions.p1))) {
                mutex.value = 1;
                await backToGame(driver)
                break;
            }
            await backToGame(driver)
            if (!(await haveshoponscreen(driver))) {
                await openGame(driver)
                mutex.value = 1;
                return;
            }
            await goDownLast(driver);
            await goUp(driver);
            break
        }
    }
    if (mutex.value >= 1) {
        return;
    }
    const { x, y } = MakeSlotList[slot]
    for (let i = 0; i < number; i++) {
        await driver.action([
            { duration: 0, x: x, y: y },
            { duration: 150, x: DefaultProduct.x, y: DefaultProduct.y },
        ])
        await driver.sleep(0.15)
    }

    // 6) Đóng panel, quay lại game
    await driver.tap(16.0, floor === 1 ? 86.0 : 65.0);
    await driver.sleep(0.1);
    await driver.tap(73.5, 60.0);
    await driver.sleep(0.1);
    await backToGame(driver);

};

const sellItems = async (driver, option, items, mutex, mutex2, removeItems = false, isAds = true, loop = true) => {
    if (mutex2.value >= items.value) {
        mutex.value = 0
        return
    }
    const { x: option_x, y: option_y } = SellOptions[option]
    await backToGame(driver)
    await goDownLast(driver)
    await driver.sleep(0.2)
    // open
    await driver.tap(64.3, 85.5)
    await driver.sleep(1)

    await driver.action([
        { duration: 0, x: 23.8, y: 54.9 },
        { duration: 300, x: 74.4, y: 54.9 },
    ])
    await driver.sleep(0.2)
    await driver.action([
        { duration: 0, x: 23.8, y: 54.9 },
        { duration: 300, x: 74.4, y: 54.9 },
    ])
    // buy all items
    let itemId = _getItemId(items)
    let count = 0, cnt = mutex2.value
    while (itemId) {
        if (mutex2.value >= items.value - 1) {
            mutex.value = 0
            break;
        }
        var soldSlot = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.soldSlot), SlotPositions.quayhang)
        if (soldSlot !== null) {
            await driver.tap(soldSlot.x, soldSlot.y)
            await driver.sleep(0.1)
            await driver.tap(soldSlot.x, soldSlot.y)
            await driver.sleep(0.5)
            await driver.tap(option_x, option_y)
            await driver.sleep(0.3)
            if (await driver.tapItemOnScreen(_getItemPath(itemId), SlotPositions.bando)) {
                await _sell(driver, isAds)
                itemId = _getItemId(items)
                mutex2.value++
            }
            else {
                break
            }
            continue
        }

        var emptySlot = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.emptySellSlot), SlotPositions.quayhang)
        if (emptySlot != null) {
            await driver.tap(emptySlot.x, emptySlot.y)
            await driver.sleep(0.6)
            await driver.tap(option_x, option_y)
            await driver.sleep(0.3)
            // choose item by image
            if ((await driver.tapItemOnScreen(_getItemPath(itemId), SlotPositions.bando))) {
                await _sell(driver, isAds)
                itemId = _getItemId(items)
                mutex2.value++
            }
            else {
                break
            }
            continue
        }
        // click ads
        if (cnt == mutex2.value) {
            var chuaqc = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.chuaqc))
            if (chuaqc) {
                if (isAds) {
                    await driver.tap(chuaqc.x, chuaqc.y)
                    await driver.sleep(0.5)
                    await driver.tap(50.0, 70.1)
                    await driver.sleep(0.5)
                    await driver.tap(60.5, 30.3)
                }
                cnt--
            }
        }
        await driver.sleep(0.2)
        if (count < 2) {
            await driver.action([
                { duration: 0, x: 74.4, y: 54.9 },
                { duration: 3000, x: 23.8, y: 54.9 },
            ])
        }

        await driver.sleep(0.5)

        count++
        if (count > 2) {
            if (removeItems) {
                while (mutex2.value < items.value) {
                    await driver.tapItemOnScreen(_getItemPath(ItemKeys.chuaqc), SlotPositions.quayhang)
                    await driver.sleep(0.4)
                    if ((await driver.tapItemOnScreen(_getItemPath(ItemKeys.xoavp), SlotPositions.quayhang))) {
                        await driver.sleep(0.3)
                        await driver.tapItemOnScreen(_getItemPath(ItemKeys.dongy2), SlotPositions.quayhang)
                        mutex2.value++
                        continue
                    }
                    else {
                        if ((await driver.haveItemOnScreen(_getItemPath(ItemKeys.chuachon, SlotPositions.p2)))) {
                            await driver.press(KeyCode.BACK);
                        }
                        else {
                            await backToGame(driver);
                            await driver.sleep(1);
                            await driver.tap(66.25, 83.7)
                        }
                        break
                    }
                }
            }
            if (mutex.value == 1) {
                return await sellItems(driver, option, items, mutex, mutex2, removeItems, isAds, loop)
            }
            break
        }

    }
    await backToGame(driver)
}



const sellEventItems = async (driver, itemKey, quantity = 9999, isAds = false) => {
    await backToGame(driver)
    await goDownLast(driver)
    const { x: option_x, y: option_y } = SellOptions[SellItemOptions.events] // event item
    // open
    await driver.tap(66.25, 83.7)
    await driver.sleep(1)
    let count = 0, cnt = 0
    while (cnt < quantity) {
        var soldSlot = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.soldSlot), SlotPositions.quayhang)
        if (soldSlot !== null) {
            await driver.tap(soldSlot.x, soldSlot.y)
            await driver.sleep(0.1)
            await driver.tap(soldSlot.x, soldSlot.y)
            await driver.sleep(0.3)
            await driver.tap(option_x, option_y)
            await driver.sleep(0.2)
            const eventItemSlot = await driver.tapItemOnScreen(_getItemPath(itemKey), SlotPositions.bando)
            if (eventItemSlot) {
                await _sell(driver, isAds)
                cnt++
                continue
            }
            else {
                await driver.press(KeyCode.BACK)
                continue
            }
        }
        var emptySlot = await driver.getCoordinateItemOnScreen(_getItemPath(ItemKeys.emptySellSlot), SlotPositions.quayhang)
        if (emptySlot != null) {
            //count++
            await driver.tap(emptySlot.x, emptySlot.y)
            await driver.sleep(0.3)
            await driver.tap(option_x, option_y)
            await driver.sleep(0.3)
            const eventItemSlot1 = await driver.tapItemOnScreen(_getItemPath(itemKey), SlotPositions.bando)
            if (eventItemSlot1) {
                await _sell(driver, isAds)
                cnt++
                continue
            }
            else {
                await driver.press(KeyCode.BACK)
                continue
            }

        }
        if (!isAds) {
            continue
        }
        if (count == 0) {
            if (chuaqc) {
                await driver.tap(chuaqc.x, chuaqc.y)
                await driver.sleep(0.5)
                await driver.tap(50.0, 73.4)
                await driver.sleep(0.5)
                await driver.tap(62.5, 27.0)
            }
        }
        await driver.sleep(0.2)
        if (count < 2) {
            await driver.action([
                { duration: 0, x: 80, y: 58.1 },
                { duration: 3 * 1000, x: 20.875, y: 58.1 },
            ])
        }
        await driver.sleep(0.5)
        count++
        if (count > 2) {
            await backToGame(driver)
            await goDownLast(driver)
            await driver.tap(66.25, 83.7)
            await driver.sleep(1)
            count = 0
            cnt = 0;
            continue
        }
    }
    await backToGame(driver)

}

const buy8SlotItem = async (driver) => {
    // open
    await driver.tap(64.3, 85.5)
    await driver.sleep(0.3)

    let count = 2;
    while (count-- > 0) {
        for (let i = 0; i < SellSlotList.length; i++) {
            const slot = SellSlotList[i]
            // double tap on slot for buy
            await driver.tap(slot.x, slot.y)
        }
    }
    await driver.tap(50.63, 97.78)
    await driver.sleep(0.7)
}

const goFriendHouse = async (driver, index) => {
    const { x, y } = FriendHouseList[index]
    await driver.tapItemOnScreen(_getItemPath(ItemKeys.friendHouse), SlotPositions.p4)
    await driver.sleep(0.5)
    await driver.tap(x, y)
    await driver.sleep(2)
}

const goMyHouse = async (driver) => {
    await driver.tapItemOnScreen(_getItemPath(ItemKeys.myHouse), SlotPositions.p3p4)
    await driver.sleep(2)
}

const makeEvents = async (driver) => {
    if (await driver.tapItemOnScreen(_getItemPath(ItemKeys.livestockEvents), SlotPositions.p4)) {
        await driver.sleep(2)
        for (let i = 0; i < 5; i++) {
            await driver.tap(41.0, 94.8)
            await driver.sleep(1)
        }
        for (let i = 0; i < 2; i++) {
            await driver.action([
                { duration: 0, x: 14.75, y: 54.9 },
                { duration: 200, x: 78.75, y: 54.9 },
            ])
        }
        await driver.sleep(1)
        for (let i = 0; i < 5; i++) {
            await driver.tap(31.0, 60.8)
            await driver.sleep(1)
        }
        for (let i = 0; i < 3; i++) {
            await driver.action([
                { duration: 0, x: 40, y: 36 },
                { duration: 100, x: 17, y: 55.8 },
            ])
            await driver.sleep(1)
        }
        await backToGame(driver)
        await driver.sleep(1)
        await backToGame(driver)
    }
}

const haveshoponscreen = async (driver) => {
    let check = await driver.haveItemOnScreen(_getItemPath(ItemKeys.shopGem), SlotPositions.p3p4)
    return check
}

module.exports = {
    openGame,
    openChests,
    goDown,
    goUp,
    goDownLast,
    backToGame,
    harvestTrees,
    plantTrees,
    makeItems,
    sellItems,
    findTreeOnScreen,
    sellEventItems,
    buy8SlotItem,
    goFriendHouse,
    goMyHouse,
    makeEvents,
    haveshoponscreen,
    findbugonfloor,
}

// private method

const _getItemPath = (itemId) => {
    if (!itemId) return null
    return resolve(__dirname, `./item/${itemId}.png`)
}

const _getItemId = (items) => {
    if (typeof items === 'object') {
        const foundIndex = items.findIndex((element) => element.value > 0)
        if (foundIndex >= 0) {
            items[foundIndex].value--
            return items[foundIndex].key
        }
        return null
    }

    return null
}



const _sell = async (driver, isAds = true) => {
    await driver.sleep(0.2)
    // increase price
    // for (let i = 0; i < 10; i++) {
    //     await driver.tap(85.0, 54.1)
    //     await driver.sleep(DelayTime)
    // }
    // await driver.sleep(0.2)
    // stop increase price
    if (!isAds) {
        // disable ads
        await driver.tap(78.1, 63.7)
        await driver.sleep(0.2)
        // click sell
        await driver.tap(78.0, 69.2)
        await driver.sleep(0.2)
    } else {
        // click sell
        await driver.tap(78.0, 69.2)
        await driver.sleep(0.2)
    }
}
const _getSlotNearest = (slotFound) => {
    let min = Number.MAX_VALUE
    let choice = 0
    for (let i = 0; i < FirstRowSlotList.length; i++) {
        let slot = FirstRowSlotList[i]
        let value = Math.abs(slot.x - slotFound.x) * Math.abs(slot.x - slotFound.x) + Math.abs(slot.y - slotFound.y) * Math.abs(slot.y - slotFound.y)

        if (value < min) {
            min = value
            choice = i
        }
    }
    return FirstRowSlotList[choice]
}
