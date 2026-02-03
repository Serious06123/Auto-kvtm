
const parseLogicLine = (line) => {
    line = line.trim()
    if (!line) return { type: 'empty' }

    if (line.includes('core.sellItems')) {
        const optionMatch = line.match(/SellItemOptions\.(\w+)/)
        const keyMatch = line.match(/(ProductKeys|ProductTreeKeys|ProductMineralKeys|EventKeys|OtherKeys)\.(\w+)/)
        const valueMatch = line.match(/value:\s*(\d+)/)

        // The current regex in the file
        const advertiseMatch = line.match(/removeItems\s*,\s*(true|false)/)

        if (optionMatch && keyMatch && valueMatch) {
            const advertise = advertiseMatch ? advertiseMatch[1] === 'true' : true
            console.log(`Parsing line: "${line}"`)
            console.log(`  - Option: ${optionMatch[1]}`)
            console.log(`  - Key: ${keyMatch[2]}`)
            console.log(`  - Advertise Match: ${advertiseMatch ? advertiseMatch[0] : 'null'}`)
            console.log(`  - Advertise Boolean: ${advertise}`)
            return {
                type: 'sellItems',
                option: optionMatch[1],
                itemKey: keyMatch[2],
                value: parseInt(valueMatch[1]),
                advertise: advertise,
                raw: line
            }
        }
        return { type: 'sellItems', raw: line, error: true }
    }
    return { type: 'raw', content: line }
}

const testLines = [
    // Standard format
    "await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems, true)",
    // User example with spaces
    "await core.sellItems(driver, SellItemOptions.tree, [{ key: ProductTreeKeys.duaHau, value: 48 }], mutex, mutex2, removeItems , true)",
    // False case
    "await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems, false)",
    // Missing boolean (legacy format)
    "await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2, removeItems)"
]

testLines.forEach(parseLogicLine)
