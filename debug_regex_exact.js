
const line = "await core.sellItems(driver, SellItemOptions.tree, [{ key: ProductTreeKeys.duaHau, value: 48 }], mutex, mutex2, removeItems , true)"

const hasRemoveItems = line.includes('removeItems')
const isExplicitTrue = /removeItems\s*,\s*true/.test(line)

console.log(`Line: "${line}"`)
console.log(`Includes 'removeItems': ${hasRemoveItems}`)
console.log(`Regex /removeItems\\s*,\\s*true/: ${isExplicitTrue}`)

const regex2 = /removeItems\s*,\s*(true|false)/
const match2 = line.match(regex2)
console.log(`Capture Group Regex: ${match2 ? match2[0] : 'null'}`)
