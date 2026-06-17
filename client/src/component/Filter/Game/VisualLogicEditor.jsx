import React, { useState, useEffect } from 'react'
import { Button, List, Space, Card, Form, Select, InputNumber, Row, Col, Modal, Typography, Tooltip, Tag, Checkbox } from 'antd'
import { DeleteOutlined, EditOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined } from '@ant-design/icons'

const { Option } = Select
const { Text } = Typography

// Regex definitions for parsing
const REGEX = {
    goUp: /await\s+core\.goUp\(\s*driver\s*,\s*(\d+)\s*\);?/,
    goDown: /await\s+core\.goDown\(\s*driver\s*,\s*(\d+)\s*\);?/,
    goDownLast: /await\s+core\.goDownLast\(\s*driver\s*\);?/,
    makeItems: /await\s+core\.makeItems\(\s*driver\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*mutex\s*\);?/,
    sleep: /await\s+driver\.sleep\(\s*(\d+(\.\d+)?)\s*\);?/,
    harvestTrees: /await\s+core\.harvestTrees\(\s*driver\s*,\s*mutex\s*,\s*(\d+)\s*,\s*(\d+)\s*\);?/,
    plantTrees: /await\s+core\.plantTrees\(\s*driver\s*,\s*mutex\s*,\s*TreeKeys\.(\w+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(true|false))?\s*\);?/,
    // sellItems: parse cả mảng nhiều item lẫn đơn item, bắt thêm isAds và loop
    sellItems: /await\s+core\.sellItems\(\s*driver\s*,\s*SellItemOptions\.(\w+)\s*,\s*\[(.+?)\]\s*,\s*mutex\s*,\s*mutex2\s*,\s*removeItems(?:\s*,\s*(false|true))?(?:\s*,\s*(false|true))?\s*\);?/,
    sellEventItems: /await\s+core\.sellEventItems\(\s*driver\s*,\s*EventKeys\.(\w+)\s*,\s*quantity\s*,\s*false\s*\);?/,
    findbugonfloor: /await\s+core\.findbugonfloor\(\s*driver\s*,\s*([\s\S]+?)\s*\);?/
}

// Helper: parse chuỗi items array string thành mảng object [{prefix, itemKey, value}]
const parseItemsArray = (arrStr) => {
    const items = []
    const re = /\{\s*key:\s*(ProductKeys\.|ProductMineralKeys\.|ProductTreeKeys\.|OtherKeys\.|EventKeys\.)(\w+),\s*value:\s*(\d+)\s*\}/g
    let m
    while ((m = re.exec(arrStr)) !== null) {
        items.push({ prefix: m[1].replace(/\.$/, ''), itemKey: m[2], value: parseInt(m[3]) })
    }
    return items
}

// Helper: xác định prefix dựa trên option
const getKeyPrefix = (option) => {
    if (option === 'tree') return 'ProductTreeKeys'
    if (option === 'mineral') return 'ProductMineralKeys'
    if (option === 'other') return 'OtherKeys'
    return 'ProductKeys'
}

const TEMPLATES = {
    goUp: (p) => `await core.goUp(driver, ${p.times})`,
    goDown: (p) => `await core.goDown(driver, ${p.times})`,
    goDownLast: () => `await core.goDownLast(driver)`,
    makeItems: (p) => `await core.makeItems(driver, ${p.floor}, ${p.slot}, ${p.number}, mutex)`,
    sleep: (p) => `await driver.sleep(${p.seconds})`,
    harvestTrees: (p) => `await core.harvestTrees(driver, mutex, ${p.floor}, ${p.pot})`,
    plantTrees: (p) => `await core.plantTrees(driver, mutex, TreeKeys.${p.treeKey}, ${p.floor}, ${p.pot}, ${p.isRight !== false})`,
    sellItems: (p) => {
        const prefix = getKeyPrefix(p.option)
        const extra = p.advertise === false ? ', false' : ', true'
        const loopParam = p.sellFullQty !== false ? ', false' : ''
        const itemsArr = (p.items || []).map(it => `{ key: ${prefix}.${it.itemKey}, value: ${it.value} }`).join(', ')
        return `await core.sellItems(driver, SellItemOptions.${p.option}, [${itemsArr}], mutex, mutex2, removeItems${extra}${loopParam})`
    },
    sellEventItems: (p) => `await core.sellEventItems(driver, EventKeys.${p.itemKey}, quantity, false)`,
    findbugonfloor: (p) => {
        const bugs = p.bugs || []
        const bugsArr = bugs.map(b => `{ key: BugKeys.${b.bugKey}, value: ${b.value} }`).join(', ')
        return `await core.findbugonfloor(driver, [${bugsArr}])`
    }
}

const VisualLogicEditor = ({ value, onChange, metadata, inputFunc, inputParams, title }) => {
    const [steps, setSteps] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStep, setEditingStep] = useState(null) // { index, data } or null for new
    const [tempParams, setTempParams] = useState({})
    const [insertIndex, setInsertIndex] = useState(null)

    // Only used for editing now
    const [selectedFunc, setSelectedFunc] = useState('goUp')

    const functionLabels = {
        goUp: 'Kéo lên',
        goDown: 'Kéo xuống',
        goDownLast: 'Kéo xuống cuối',
        makeItems: 'Sản xuất vật phẩm',
        sleep: 'Ngưng',
        harvestTrees: 'Thu hoạch cây',
        plantTrees: 'Trồng cây',
        sellItems: 'Bán đồ',
        findbugonfloor: 'Bắt bọ'
    }

    // Parse value on load
    useEffect(() => {
        const lines = (value || '').split('\n').filter(l => l.trim())
        const newSteps = lines.map(line => {
            const trimmed = line.trim()
            for (const [key, regex] of Object.entries(REGEX)) {
                const match = trimmed.match(regex)
                if (match) {
                    const params = {}
                    if (key === 'goUp' || key === 'goDown') params.times = match[1]
                    if (key === 'makeItems') { params.floor = match[1]; params.slot = match[2]; params.number = match[3] }
                    if (key === 'sleep') params.seconds = match[1]
                    if (key === 'harvestTrees') { params.floor = match[1]; params.pot = match[2] }
                    if (key === 'plantTrees') {
                        params.treeKey = match[1]
                        params.floor = match[2]
                        params.pot = match[3]
                        params.isRight = match[4] !== 'false'
                    }
                    if (key === 'sellItems') {
                        params.option = match[1]
                        // match[2] chứa nội dung mảng items, parse ra thành array
                        params.items = parseItemsArray(match[2])
                        params.advertise = match[4] !== 'false'
                        // match[5] là ", false" hoặc ", true" của loop. Nếu loop=false -> sellFullQty=true (ngược logic)
                        if (match[5]) {
                            params.sellFullQty = match[6] === 'false'
                        } else {
                            params.sellFullQty = false // không có tham số loop = mặc định loop=true = không tick
                        }
                    }
                    if (key === 'sellEventItems') { params.itemKey = match[1]; params.option = 'events' }
                    if (key === 'findbugonfloor') {
                        const argStr = match[1].trim()
                        let bugs = []
                        if (argStr.startsWith('[{')) {
                            const re = /\{\s*key:\s*BugKeys\.(\w+),\s*value:\s*(\d+)\s*\}/g
                            let m
                            while ((m = re.exec(argStr)) !== null) {
                                bugs.push({ bugKey: m[1], value: parseInt(m[2]) })
                            }
                        } else if (argStr.startsWith('[')) {
                            const re = /BugKeys\.(\w+)/g
                            let m
                            while ((m = re.exec(argStr)) !== null) {
                                bugs.push({ bugKey: m[1], value: 9999 })
                            }
                        } else {
                            const m = argStr.match(/BugKeys\.(\w+)/)
                            if (m) {
                                bugs.push({ bugKey: m[1], value: 9999 })
                            }
                        }
                        params.bugs = bugs
                    }
 
                    return { type: key === 'sellEventItems' ? 'sellItems' : key, params, original: line, isCustom: false }
                }
            }
            return { type: 'custom', params: {}, original: line, isCustom: true }
        })
        setSteps(newSteps)
    }, [value])

    const updateLogic = (newSteps) => {
        const code = newSteps.map(s => {
            if (s.isCustom) return s.original
            const tpl = s.type === 'sellItems' && s.params.option === 'events' ? TEMPLATES.sellEventItems : TEMPLATES[s.type]
            return tpl ? tpl(s.params) : s.original
        }).join('\n')
        onChange(code)
    }

    const handleDelete = (index) => {
        const newSteps = [...steps]
        newSteps.splice(index, 1)
        setSteps(newSteps)
        updateLogic(newSteps)
    }

    const handleMove = (index, direction) => {
        const newSteps = [...steps]
        if (direction === -1 && index > 0) {
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]]
        } else if (direction === 1 && index < newSteps.length - 1) {
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
        }
        setSteps(newSteps)
        updateLogic(newSteps)
    }

    const handleInsert = (index) => {
        setInsertIndex(index)
        setEditingStep(null)
        // Default to first function
        setSelectedFunc('goUp')
        setTempParams({ times: 1 })
        setIsModalOpen(true)
    }

    const openEditModal = (step, index) => {
        if (step.isCustom) return
        setInsertIndex(null)
        setEditingStep({ index, ...step })
        setSelectedFunc(step.type)
        setTempParams({ ...step.params })
        setIsModalOpen(true)
    }

    const handleOk = () => {
        const newStep = {
            type: selectedFunc,
            params: { ...tempParams },
            isCustom: false
        }

        // Default value handling if params are missing
        if (selectedFunc === 'goUp' || selectedFunc === 'goDown') newStep.params.times = newStep.params.times || 1
        if (selectedFunc === 'makeItems') {
            newStep.params.floor = newStep.params.floor || 1
            newStep.params.slot = newStep.params.slot || 0
            newStep.params.number = newStep.params.number || 1
        }
        if (selectedFunc === 'sleep') newStep.params.seconds = newStep.params.seconds || 1
        if (selectedFunc === 'harvestTrees') {
            newStep.params.floor = newStep.params.floor || 4
            newStep.params.pot = newStep.params.pot || 5
        }
        if (selectedFunc === 'plantTrees') {
            newStep.params.treeKey = newStep.params.treeKey || 'tuyet'
            newStep.params.floor = newStep.params.floor || 4
            newStep.params.pot = newStep.params.pot || 5
            newStep.params.isRight = newStep.params.isRight !== false
        }
        if (selectedFunc === 'findbugonfloor') {
            newStep.params.bugs = newStep.params.bugs && newStep.params.bugs.length ? newStep.params.bugs : [{ bugKey: 'ong', value: 5 }]
        }
        if (selectedFunc === 'sellItems') {
            newStep.params.option = newStep.params.option || 'goods'
            if (newStep.params.option === 'events') {
                newStep.params.itemKey = newStep.params.itemKey || 'bo'
            } else {
                if (!newStep.params.items || !newStep.params.items.length) {
                    const defKey = newStep.params.option === 'tree' ? 'dua' : (newStep.params.option === 'mineral' ? 'thoidong' : 'traHoaHong')
                    newStep.params.items = [{ itemKey: defKey, value: 20 }]
                }
            }
        }

        const newSteps = [...steps]
        if (insertIndex !== null) {
            newSteps.splice(insertIndex + 1, 0, newStep)
        } else if (editingStep) {
            newSteps[editingStep.index] = newStep
        }

        setSteps(newSteps)
        updateLogic(newSteps)
        setIsModalOpen(false)
        setInsertIndex(null)
    }

    const getStepDescription = (item) => {
        if (item.isCustom) return <Text type="secondary">{item.original}</Text>
        const p = item.params
        switch (item.type) {
            case 'goUp': return <Tag color="blue">Kéo lên {p.times} lần</Tag>
            case 'goDown': return <Tag color="cyan">Kéo xuống {p.times} lần</Tag>
            case 'goDownLast': return <Tag color="cyan">Kéo xuống cuối</Tag>
            case 'makeItems': return <Tag color="purple">SX: Tầng {p.floor}, Ô {p.slot}, SL {p.number}</Tag>
            case 'sleep': return <Tag color="orange">Nghỉ {p.seconds}s</Tag>
            case 'harvestTrees': return <Tag color="green">Thu hoạch: {p.floor} tầng, {p.pot} chậu</Tag>
            case 'plantTrees': return <Tag color="lime">Trồng {p.treeKey}: {p.floor} tầng, {p.pot} chậu {p.isRight === false ? '(Trái)' : '(Phải)'}</Tag>
            case 'sellItems': {
                if (p.option === 'events') return <Tag color="gold">Bán Event: {p.itemKey}</Tag>
                const itemsList = (p.items || []).map(it => `${it.itemKey}(${it.value})`).join(', ')
                const fullTag = p.sellFullQty !== false ? ' ✅' : ''
                return <Tag color="gold">Bán [{itemsList}] ({p.option}){fullTag} {p.advertise === false ? '(No Ad)' : ''}</Tag>
            }
            case 'findbugonfloor': {
                const bugsList = (p.bugs || []).map(b => `${b.bugKey}(${b.value})`).join(', ')
                return <Tag color="red">Bắt bọ: [{bugsList}]</Tag>
            }
            default: return item.type
        }
    }

    const renderParamInputs = () => {
        const setP = (k, v) => setTempParams(prev => ({ ...prev, [k]: v }))

        if (selectedFunc === 'goUp' || selectedFunc === 'goDown') {
            return (
                <Form.Item label="Times (Số lần)">
                    <InputNumber min={1} value={tempParams.times} onChange={v => setP('times', v)} />
                </Form.Item>
            )
        }
        if (selectedFunc === 'makeItems') {
            return (
                <Row gutter={16}>
                    <Col span={8}><Form.Item label="Floor (Tầng)"><InputNumber min={1} max={5} value={tempParams.floor} onChange={v => setP('floor', v)} /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Slot (Ô 0-5)"><InputNumber min={0} max={5} value={tempParams.slot} onChange={v => setP('slot', v)} /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Count (SL)"><InputNumber min={1} value={tempParams.number} onChange={v => setP('number', v)} /></Form.Item></Col>
                </Row>
            )
        }
        if (selectedFunc === 'sleep') {
            return <Form.Item label="Seconds (Giây)"><InputNumber min={0.1} step={0.1} value={tempParams.seconds} onChange={v => setP('seconds', v)} /></Form.Item>
        }
        if (selectedFunc === 'harvestTrees') {
            return (
                <Row gutter={16}>
                    <Col span={12}><Form.Item label="Floors (Tầng)"><InputNumber min={1} max={5} value={tempParams.floor} onChange={v => setP('floor', v)} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="Pots Last (Chậu)"><InputNumber min={1} max={10} value={tempParams.pot} onChange={v => setP('pot', v)} /></Form.Item></Col>
                </Row>
            )
        }
        if (selectedFunc === 'plantTrees') {
            return (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="Tree">
                                <Select value={tempParams.treeKey} onChange={v => setP('treeKey', v)} showSearch>
                                    {Object.keys(metadata?.consts?.TreeKeys || {}).map(k => <Option key={k} value={k}>{k}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}><Form.Item label="Floors"><InputNumber min={1} max={5} value={tempParams.floor} onChange={v => setP('floor', v)} /></Form.Item></Col>
                        <Col span={8}><Form.Item label="Pots Last"><InputNumber min={1} max={10} value={tempParams.pot} onChange={v => setP('pot', v)} /></Form.Item></Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Form.Item label="Direction">
                                <Select value={tempParams.isRight !== false} onChange={v => setP('isRight', v)}>
                                    <Option value={true}>Phải (Mặc định)</Option>
                                    <Option value={false}>Trái</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            )
        }
        if (selectedFunc === 'findbugonfloor') {
            const bugs = tempParams.bugs || []
            const updateBug = (idx, field, val) => {
                const newBugs = [...bugs]
                newBugs[idx] = { ...newBugs[idx], [field]: val }
                setP('bugs', newBugs)
            }
            const addBug = () => {
                setP('bugs', [...bugs, { bugKey: 'ong', value: 5 }])
            }
            const removeBug = (idx) => {
                const newBugs = bugs.filter((_, i) => i !== idx)
                setP('bugs', newBugs.length ? newBugs : [{ bugKey: 'ong', value: 5 }])
            }
            return (
                <>
                    <Row gutter={16} style={{ marginBottom: 12 }}>
                        <Col span={16}><Form.Item label="Danh sách bắt bọ và số lượng" style={{ marginBottom: 0 }} /></Col>
                        <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button type="dashed" icon={<PlusOutlined />} onClick={addBug} block>Thêm loại bọ</Button>
                        </Col>
                    </Row>
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 8, background: '#fff' }}>
                        {bugs.map((it, idx) => (
                            <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
                                <Col span={2}><Text strong style={{ color: '#999' }}>#{idx + 1}</Text></Col>
                                <Col span={11}>
                                    <Select value={it.bugKey} onChange={v => updateBug(idx, 'bugKey', v)} style={{ width: '100%' }}>
                                        {Object.keys(metadata?.consts?.BugKeys || {}).map(k => <Option key={k} value={k}>{k}</Option>)}
                                    </Select>
                                </Col>
                                <Col span={7}>
                                    <InputNumber min={1} value={it.value} onChange={v => updateBug(idx, 'value', v)} style={{ width: '100%' }} placeholder="SL" />
                                </Col>
                                <Col span={4}>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeBug(idx)} disabled={bugs.length <= 1} />
                                </Col>
                            </Row>
                        ))}
                    </div>
                </>
            )
        }
        if (selectedFunc === 'sellItems') {
            const sellOptions = metadata?.consts?.SellItemOptions || {}
            const getKeys = () => {
                if (tempParams.option === 'tree') return metadata?.consts?.ProductTreeKeys || {}
                if (tempParams.option === 'mineral') return metadata?.consts?.ProductMineralKeys || {}
                if (tempParams.option === 'events') return metadata?.consts?.EventKeys || {}
                if (tempParams.option === 'other') return metadata?.consts?.OtherKeys || {}
                return metadata?.consts?.ProductKeys || {}
            }
            const items = tempParams.items || []
            const updateItem = (idx, field, val) => {
                const newItems = [...items]
                newItems[idx] = { ...newItems[idx], [field]: val }
                setP('items', newItems)
            }
            const addItem = () => {
                const defKey = tempParams.option === 'tree' ? 'dua' : (tempParams.option === 'mineral' ? 'thoidong' : (tempParams.option === 'other' ? 'gach' : 'traHoaHong'))
                setP('items', [...items, { itemKey: defKey, value: 20 }])
            }
            const removeItem = (idx) => {
                const newItems = items.filter((_, i) => i !== idx)
                setP('items', newItems.length ? newItems : [{ itemKey: 'traHoaHong', value: 20 }])
            }

            if (tempParams.option === 'events') {
                return (
                    <>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Loại">
                                    <Select value={tempParams.option} onChange={v => { setP('option', v); setP('items', []) }}>
                                        {Object.keys(sellOptions).map(k => <Option key={k} value={k}>{k}</Option>)}
                                        <Option value="events">Events</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Item">
                                    <Select value={tempParams.itemKey} onChange={v => setP('itemKey', v)} showSearch>
                                        {Object.keys(getKeys()).map(k => <Option key={k} value={k}>{k}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </>
                )
            }

            return (
                <>
                    <Row gutter={16} style={{ marginBottom: 12 }}>
                        <Col span={8}>
                            <Form.Item label="Loại" style={{ marginBottom: 0 }}>
                                <Select value={tempParams.option} onChange={v => { setP('option', v); setP('items', []) }}>
                                    {Object.keys(sellOptions).map(k => <Option key={k} value={k}>{k}</Option>)}
                                    <Option value="events">Events</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Quảng Cáo" style={{ marginBottom: 0 }}>
                                <Select value={tempParams.advertise !== false} onChange={v => setP('advertise', v)}>
                                    <Option value={true}>Có</Option>
                                    <Option value={false}>Không</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} block style={{ marginBottom: 0 }}>Thêm Món</Button>
                        </Col>
                    </Row>
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 8, background: '#fff' }}>
                        {items.map((it, idx) => (
                            <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
                                <Col span={2}><Text strong style={{ color: '#999' }}>#{idx + 1}</Text></Col>
                                <Col span={11}>
                                    <Select value={it.itemKey} onChange={v => updateItem(idx, 'itemKey', v)} showSearch style={{ width: '100%' }} placeholder="Chọn món">
                                        {Object.keys(getKeys()).map(k => <Option key={k} value={k}>{k}</Option>)}
                                    </Select>
                                </Col>
                                <Col span={7}>
                                    <InputNumber min={1} value={it.value} onChange={v => updateItem(idx, 'value', v)} style={{ width: '100%' }} placeholder="SL" />
                                </Col>
                                <Col span={4}>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} disabled={items.length <= 1} />
                                </Col>
                            </Row>
                        ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Checkbox checked={tempParams.sellFullQty !== false} onChange={e => setP('sellFullQty', e.target.checked)}>
                            Bán đủ số lượng thì mới chạy auto tiếp
                        </Checkbox>
                    </div>
                </>
            )
        }
        return null
    }

    return (
        <div style={{ padding: 8, border: '1px solid #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{title || 'Visual Editor'}</Typography.Title>
            </div>

            <List
                size="small"
                bordered
                dataSource={steps}
                renderItem={(item, index) => (
                    <List.Item
                        actions={[
                            <Tooltip title="Insert after">
                                <Button type="text" icon={<PlusOutlined />} onClick={() => handleInsert(index)} />
                            </Tooltip>,
                            <Button type="text" icon={<EditOutlined />} disabled={item.isCustom} onClick={() => openEditModal(item, index)} />,
                            <Button type="text" icon={<ArrowUpOutlined />} onClick={() => handleMove(index, -1)} disabled={index === 0} />,
                            <Button type="text" icon={<ArrowDownOutlined />} onClick={() => handleMove(index, 1)} disabled={index === steps.length - 1} />,
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(index)} />
                        ]}
                    >
                        <List.Item.Meta
                            title={
                                <Space>
                                    <Text strong>{index + 1}.</Text>
                                    {item.isCustom ? <Tag color="default">Custom Code</Tag> : <Text strong>{item.type}</Text>}
                                </Space>
                            }
                            description={getStepDescription(item)}
                        />
                    </List.Item>
                )}
                style={{ maxHeight: 400, overflowY: 'auto', background: '#fff' }}
            />

            <Modal
                title={insertIndex !== null ? 'Insert Step' : (editingStep ? `Edit Step #${editingStep.index + 1}` : 'Step Editor')}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                width={700}
            >
                <Form layout="vertical">

                    <Form.Item label="Function">
                        <Row gutter={[8, 8]}>
                            {['goUp', 'goDown', 'goDownLast', 'makeItems', 'sleep', 'harvestTrees', 'plantTrees', 'sellItems', 'findbugonfloor'].map(func => (
                                <Col key={func}>
                                    <Button
                                        type={selectedFunc === func ? 'primary' : 'default'}
                                        onClick={() => {
                                            setSelectedFunc(func)
                                            // Set default params for new selections
                                            if (func === 'sellItems') {
                                                setTempParams(prev => ({
                                                    ...prev,
                                                    advertise: true,
                                                    option: 'goods',
                                                    sellFullQty: false,
                                                    items: [{ itemKey: 'traHoaHong', value: 20 }]
                                                }))
                                            } else if (func === 'findbugonfloor') {
                                                setTempParams(prev => ({
                                                    ...prev,
                                                    bugs: prev?.bugs && prev.bugs.length ? prev.bugs : [{ bugKey: 'ong', value: 5 }]
                                                }))
                                            } else {
                                                setTempParams({})
                                            }
                                        }}
                                        size="small"
                                    >
                                        {functionLabels[func] || func}
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </Form.Item>

                    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                        {renderParamInputs()}
                    </div>
                </Form>
            </Modal>
        </div>
    )
}

export default VisualLogicEditor
