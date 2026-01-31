import React, { useEffect, useState } from 'react'
import { Modal, Button, Input, Select, InputNumber, Space, Divider, List, Form, Row, Col, Checkbox } from 'antd'
import axios from 'axios'

const { TextArea } = Input
const { Option } = Select

const CreateAutoModal = ({ open, onClose, selectedGame, editingAuto }) => {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [category, setCategory] = useState('vp')
  const [loopCount, setLoopCount] = useState(5)
  const [sleepSeconds, setSleepSeconds] = useState(8)
  const [logic, setLogic] = useState('')
  const [sellLogic, setSellLogic] = useState('')
  const [metadata, setMetadata] = useState({ functions: [], consts: {} })

  // For adding functions
  const [selectedFunc, setSelectedFunc] = useState('')
  const [funcParams, setFuncParams] = useState({})

  useEffect(() => {
    if (!open) return
    axios.get('/api/autoMetadata').then((r) => setMetadata(r.data)).catch(() => {})
    if (editingAuto) {
      setName(editingAuto.name || '')
      setKey(editingAuto.key || '')
      setCategory(editingAuto.category || 'vp')
      setLoopCount(editingAuto.loopCount || 5)
      setSleepSeconds(editingAuto.sleepSeconds || 8)
      setLogic((editingAuto.logic && editingAuto.logic.production ? editingAuto.logic.production.join('\n') : '') || '')
      // when editing, prefer to show original sell logic (e.g. core.sellItems call) if available
      if (editingAuto.logic && editingAuto.logic.sell && editingAuto.logic.sell.length) {
        const filtered = editingAuto.logic.sell
          .map((l) => (typeof l === 'string' ? l.trim() : ''))
          .filter((l) => l && !l.startsWith('//'))
        setSellLogic(filtered.join('\n'))
      } else {
        setSellLogic('Lỗi không hiện thị được logic')
      }
    } else {
      setName('')
      setKey('')
      setCategory('vp')
      setLoopCount(5)
      setSleepSeconds(0)
      setLogic('')
      setSellLogic('')
    }
  }, [open, editingAuto])

  const appendSnippet = (s) => setLogic((l) => (l ? l + '\n' + s : s))

  const submit = async () => {
    const payload = {
      name,
      key,
      category,
      loopCount,
      sleepSeconds,
      logic: {
        production: logic.split('\n').filter(Boolean),
        sell: sellLogic.split('\n').filter(Boolean),
      },
      sellItems: false,
    }
    try {
      if (editingAuto) {
        await axios.post('/api/updateAuto', payload)
      } else {
        await axios.post('/api/createAuto', payload)
      }
      onClose(true)
    } catch (e) {
      alert('Error creating auto: ' + (e.message || ''))
    }
  }
  const functionLabels = {
    goUp: 'Kéo lên',
    goDown: 'Kéo xuống',
    goDownLast: 'Kéo xuống cuối',
    makeItems: 'Sản xuất vật phẩm',
    sleep: 'Ngưng',
    harvestTrees: 'Thu hoạch cây',
    plantTrees: 'Trồng cây',
    sellItems: 'Bán đồ',
  }
  const addFunction = () => {
    let snippet = `await core.${selectedFunc}(driver`
    if (selectedFunc === 'goUp' || selectedFunc === 'goDown') {
      snippet += `, ${funcParams.times || 1}`
    } else if (selectedFunc === 'makeItems') {
      snippet += `, ${funcParams.floor || 1}, ${funcParams.slot || 0}, ${funcParams.number || 1}, mutex`
    } else if (selectedFunc === 'sleep') {
      snippet = `await driver.sleep(${funcParams.seconds || 1}`
    } else if (selectedFunc === 'harvestTrees') {
      snippet += `, mutex, ${funcParams.floor || 4}, ${funcParams.pot || 5}`
    } else if (selectedFunc === 'plantTrees') {
      snippet += `, mutex, TreeKeys.${funcParams.treeKey || 'tuyet'}, ${funcParams.floor || 4}, ${funcParams.pot || 5}`
    } else if (selectedFunc === 'sellItems') {
      if (funcParams.option === 'events') {
        // generate call for selling event items
        const eventRef = `EventKeys.${funcParams.itemKey || 'bo'}`
        snippet = `await core.sellEventItems(driver, ${eventRef}, quantity, false)`
      } else {
        const productRef = funcParams.option === 'tree'
          ? `ProductTreeKeys.${funcParams.itemKey || 'dua'}`
          : funcParams.option === 'mineral'
            ? `ProductMineralKeys.${funcParams.itemKey || 'thoidong'}`
            : `ProductKeys.${funcParams.itemKey || 'traHoaHong'}`
        const extraAdvert = funcParams.advertise === false ? ', false' : ''
        snippet += `, SellItemOptions.${funcParams.option || 'goods'}, [{ key: ${productRef}, value: ${funcParams.value || 20} }], mutex, mutex2, removeItems${extraAdvert}`
      }
    } else {
      // default
      snippet += ''
    }
    snippet += ')'
    if (selectedFunc === 'sellItems') {
      setSellLogic((l) => (l ? l + '\n' + snippet : snippet))
    } else {
      appendSnippet(snippet)
    }
    setSelectedFunc('')
    setFuncParams({})
  }

  const renderParamInputs = () => {
    if (!selectedFunc) return null
    if (selectedFunc === 'goUp' || selectedFunc === 'goDown') {
      return (
        <Form.Item label="Times(Số lần)">
          <InputNumber min={1} value={funcParams.times} onChange={(v) => setFuncParams({ ...funcParams, times: v })} />
        </Form.Item>
      )
    }
    if ( selectedFunc === 'goDownLast') {
      return null
    }
    if (selectedFunc === 'makeItems') {
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Tầng của máy hiện tại">
              <InputNumber min={1} max={2} value={funcParams.floor} onChange={(v) => setFuncParams({ ...funcParams, floor: v })} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Vp ô thứ mấy (0-5)">
              <InputNumber min={0} max={4} value={funcParams.slot} onChange={(v) => setFuncParams({ ...funcParams, slot: v })} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số lượng sản xuất">
              <InputNumber min={1} value={funcParams.number} onChange={(v) => setFuncParams({ ...funcParams, number: v })} />
            </Form.Item>
          </Col>
        </Row>
      )
    }

    if (selectedFunc === 'sleep') {
      return (
        <Form.Item label="Thời gian nghỉ(Giây)">
          <InputNumber min={1} value={funcParams.seconds} onChange={(v) => setFuncParams({ ...funcParams, seconds: v })} />
        </Form.Item>
      )
    }
    if (selectedFunc === 'harvestTrees') {
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Thu hoạch mấy tầng">
              <InputNumber min={1} max={4} value={funcParams.floor} onChange={(v) => setFuncParams({ ...funcParams, floor: v })} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Thu hoạch tầng cuối mấy cây">
              <InputNumber min={1} max={5} value={funcParams.pot} onChange={(v) => setFuncParams({ ...funcParams, pot: v })} />
            </Form.Item>
          </Col>
        </Row>
      )
    }
    if (selectedFunc === 'plantTrees') {
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Tree Key">
              <Select value={funcParams.treeKey} onChange={(v) => setFuncParams({ ...funcParams, treeKey: v })}>
                {Object.keys(metadata.consts.TreeKeys || {}).map(k => <Option key={k} value={k}>{k}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Muốn trồng mấy tầng">
              <InputNumber min={1} max={4} value={funcParams.floor} onChange={(v) => setFuncParams({ ...funcParams, floor: v })} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tầng cuối trồng mấy cây">
              <InputNumber min={1} max={5} value={funcParams.pot} onChange={(v) => setFuncParams({ ...funcParams, pot: v })} />
            </Form.Item>
          </Col>
        </Row>
      )
    }
    if (selectedFunc === 'sellItems') {
      console.log('Render sellItems inputs - funcParams:', funcParams)
      const sellOptions = metadata.consts?.SellItemOptions || {}
      const productKeysForOption = () => {
        if (funcParams.option === 'tree') return metadata.consts?.ProductTreeKeys || {}
        if (funcParams.option === 'mineral') return metadata.consts?.ProductMineralKeys || {}
        if (funcParams.option === 'events') return metadata.consts?.EventKeys || {}
        if (funcParams.option === 'goods') return metadata.consts?.ProductKeys || {}
        if ( funcParams.option === 'other') return metadata.consts?.OtherKeys || {}
        return metadata.consts?.ProductKeys || {}
      }
      const productOptions = productKeysForOption()
      const productLabel = 'Tên vật phẩm'

      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Bán loại nào(cây - vp - event...)">
              <Select value={funcParams.option} onChange={(v) => setFuncParams({ ...funcParams, option: v })}>
                {Object.keys(sellOptions).map(k => <Option key={k} value={k}>{k}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={productLabel}>
              <Select value={funcParams.itemKey} onChange={(v) => setFuncParams({ ...funcParams, itemKey: v })}>
                {Object.keys(productOptions).map(k => <Option key={k} value={k}>{k}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số lượng bán">
              <Space>
                <InputNumber min={1} value={funcParams.value} onChange={(v) => setFuncParams({ ...funcParams, value: v })} />
                  {(() => {
                    const checked = typeof funcParams.advertise === 'undefined' ? true : !!funcParams.advertise
                    return (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={checked} onChange={(e) => setFuncParams({ ...funcParams, advertise: e.target.checked })} />
                        <span>Quảng cáo</span>
                      </label>
                    )
                  })()}
              </Space>
            </Form.Item>
          </Col>
        </Row>
      )
    }
    return null
  }

  return (
    <Modal title={editingAuto ? 'Edit Auto' : 'Create Auto'} open={open} onCancel={() => onClose(false)} footer={null} width={1200}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input placeholder="Auto name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Key (file name)" value={key} onChange={(e) => setKey(e.target.value)} readOnly={!!editingAuto} />
        <Select value={category} onChange={(v) => setCategory(v)} style={{ width: 200 }}>
          <Option value="vp">VP</Option>
          <Option value="tree">Tree</Option>
          <Option value="event">Event</Option>
        </Select>
        <div>
          <span>Bán sau khi chạy  </span>
          <InputNumber min={1} max={9999} value={loopCount} onChange={(v) => setLoopCount(v)} />
          <span> lần </span>
        </div>
        <div>
          <span>Thời gian nghỉ mỗi vòng (giây)  </span>
          <InputNumber min={0} max={9999} value={sleepSeconds} onChange={(v) => setSleepSeconds(v)} />
        </div>

        <Divider orientation="left">Add Function</Divider>
        <Form layout="vertical">
          <Form.Item label="Select Function">
            <Row gutter={8}>
              {['goUp', 'goDown', 'goDownLast', 'makeItems', 'sleep', 'harvestTrees', 'plantTrees', 'sellItems'].map(func => (
                <Col key={func}>
                  <Button
                    type={selectedFunc === func ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedFunc(func)
                        console.log('Select function clicked:', func, 'current funcParams:', funcParams)
                      if (func === 'sellItems') {
                        setFuncParams((prev) => ({
                          ...prev,
                          advertise: true,
                          option: prev?.option || 'goods',
                          itemKey: prev?.itemKey || (prev?.option === 'tree' ? 'dua' : 'traHoaHong'),
                          value: prev?.value || 20,
                        }))
                      } else {
                        setFuncParams({})
                      }
                    }}
                  >
                    {functionLabels[func] || func}
                  </Button>
                </Col>
              ))}
            </Row>
          </Form.Item>
          {renderParamInputs()}
          <Button onClick={addFunction} disabled={!selectedFunc}>Add to Logic</Button>
        </Form>

        <Divider orientation="left">Logic</Divider>
        <TextArea rows={10} placeholder={'Production logic lines'} value={logic} onChange={(e) => setLogic(e.target.value)} />

        <Divider orientation="left">Sell Logic</Divider>
        <TextArea rows={5} placeholder={'Sell logic lines'} value={sellLogic} onChange={(e) => setSellLogic(e.target.value)} />

        <Space>
          <Button type="primary" onClick={submit}>{editingAuto ? 'Update' : 'Create'}</Button>
          <Button onClick={() => onClose(false)}>Cancel</Button>
        </Space>
      </Space>
    </Modal>
  )
}

export default CreateAutoModal
