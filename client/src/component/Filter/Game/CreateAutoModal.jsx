import React, { useEffect, useState } from 'react'
import { Modal, Button, Input, Select, InputNumber, Space, Divider, List, Form, Row, Col, Checkbox, Tabs, Radio } from 'antd'
import axios from 'axios'
import VisualLogicEditor from './VisualLogicEditor'

const { TextArea } = Input
const { Option } = Select

const CreateAutoModal = ({ open, onClose, selectedGame, editingAuto }) => {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [category, setCategory] = useState('vp')
  const [order, setOrder] = useState(0)
  const [recommend, setRecommend] = useState(false)
  const [loopCount, setLoopCount] = useState(5)
  const [sleepSeconds, setSleepSeconds] = useState(8)
  const [logic, setLogic] = useState('')
  const [sellLogic, setSellLogic] = useState('')
  const [metadata, setMetadata] = useState({ functions: [], consts: {} })

  const [prodVisual, setProdVisual] = useState(true)
  const [sellVisual, setSellVisual] = useState(true)

  // For legacy adding functions (kept for code mode reference or could be removed if fully replaced)
  const [selectedFunc, setSelectedFunc] = useState('')
  const [funcParams, setFuncParams] = useState({})

  useEffect(() => {
    if (!open) return
    axios.get('/api/autoMetadata').then((r) => setMetadata(r.data)).catch(() => { })
    if (editingAuto) {
      setName(editingAuto.name || '')
      setKey(editingAuto.key || '')
      setCategory(editingAuto.category || 'vp')
      setOrder(editingAuto.order || 0)
      setRecommend(editingAuto.recommend || false)
      setLoopCount(editingAuto.loopCount || 5)
      setSleepSeconds(editingAuto.sleepSeconds || 8)
      setLogic((editingAuto.logic && editingAuto.logic.production ? editingAuto.logic.production.join('\n') : '') || '')
      const sellLines = (editingAuto.logic && editingAuto.logic.sell) || []
      const filtered = sellLines
        .map((l) => (typeof l === 'string' ? l.trim() : ''))
        .filter((l) => l && !l.startsWith('//'))
      setSellLogic(filtered.join('\n'))
    } else {
      setName('')
      setKey('')
      setCategory('vp')
      setOrder(0)
      setRecommend(false)
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
      order,
      recommend,
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

  // Legacy manual add logic
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
      snippet += `, mutex, TreeKeys.${funcParams.treeKey || 'tuyet'}, ${funcParams.floor || 4}, ${funcParams.pot || 5}, ${funcParams.isRight !== false}` // default TRUE (Right)
    } else if (selectedFunc === 'sellItems') {
      if (funcParams.option === 'events') {
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
      snippet += ''
    }
    snippet += ')'

    // Smart routing: Sell items go to Sell Logic, others to Production Logic
    if (selectedFunc === 'sellItems') {
      setSellLogic((l) => (l ? l + '\n' + snippet : snippet))
    } else {
      appendSnippet(snippet)
    }
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
    if (selectedFunc === 'goDownLast') {
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
          <InputNumber min={0.1} step={0.1} value={funcParams.seconds} onChange={(v) => setFuncParams({ ...funcParams, seconds: v })} />
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
        <>
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
          <Row>
            <Col span={24}>
              <Form.Item label="Direction">
                <Select value={funcParams.isRight !== false} onChange={v => setFuncParams({ ...funcParams, isRight: v })}>
                  <Option value={true}>Phải (Mặc định)</Option>
                  <Option value={false}>Trái</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </>
      )
    }
    if (selectedFunc === 'sellItems') {
      const sellOptions = metadata.consts?.SellItemOptions || {}
      const productKeysForOption = () => {
        if (funcParams.option === 'tree') return metadata.consts?.ProductTreeKeys || {}
        if (funcParams.option === 'mineral') return metadata.consts?.ProductMineralKeys || {}
        if (funcParams.option === 'events') return metadata.consts?.EventKeys || {}
        if (funcParams.option === 'goods') return metadata.consts?.ProductKeys || {}
        if (funcParams.option === 'other') return metadata.consts?.OtherKeys || {}
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

  const renderSection = (title, val, setVal, isVisual, setIsVisual) => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
        <Divider orientation="left" style={{ margin: 0, width: 'auto', minWidth: '150px' }}>{title}</Divider>
        <Radio.Group value={isVisual ? 'visual' : 'code'} onChange={e => setIsVisual(e.target.value === 'visual')} buttonStyle="solid" size="small">
          <Radio.Button value="visual">Visual</Radio.Button>
          <Radio.Button value="code">Raw Code</Radio.Button>
        </Radio.Group>
      </div>
      {isVisual ? (
        <VisualLogicEditor
          value={val}
          onChange={setVal}
          metadata={metadata}
          inputFunc={selectedFunc}
          inputParams={funcParams}
          title={null}
        />
      ) : (
        <>
          <TextArea rows={10} placeholder={'Logic lines'} value={val} onChange={(e) => setVal(e.target.value)} />
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <Button type="dashed" size="small" onClick={addFunction} disabled={!selectedFunc}>Add Function (Raw)</Button>
          </div>
        </>
      )}
    </>
  )

  return (
    <Modal title={editingAuto ? 'Edit Auto' : 'Create Auto'} open={open} onCancel={() => onClose(false)} footer={null} width={1200}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input placeholder="Auto name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Key (file name)" value={key} onChange={(e) => setKey(e.target.value)} readOnly={!!editingAuto} />
        <Select value={category} onChange={(v) => setCategory(v)} style={{ width: 200 }}>
          <Option value="vp">VP</Option>
          <Option value="tree">Tree</Option>
          <Option value="event">Event</Option>
          <Option value="other">Other</Option>
        </Select>
        <Space>
          <span>Order:</span>
          <InputNumber value={order} onChange={setOrder} />
          <Checkbox checked={recommend} onChange={(e) => setRecommend(e.target.checked)}>Recommend</Checkbox>
        </Space>
        <div>
          <span>Bán sau khi chạy  </span>
          <InputNumber min={1} max={9999} value={loopCount} onChange={(v) => setLoopCount(v)} />
          <span> lần </span>
        </div>
        <div>
          <span>Thời gian nghỉ mỗi vòng (giây)  </span>
          <InputNumber min={0} max={9999} value={sleepSeconds} onChange={(v) => setSleepSeconds(v)} />
        </div>

        <Divider orientation="left">Function & Parameters</Divider>
        <Form layout="vertical">
          <Form.Item label="Select Function">
            <Row gutter={8}>
              {['goUp', 'goDown', 'goDownLast', 'makeItems', 'sleep', 'harvestTrees', 'plantTrees', 'sellItems'].map(func => (
                <Col key={func}>
                  <Button
                    type={selectedFunc === func ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedFunc(func)
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
          <Button type="primary" onClick={addFunction} disabled={!selectedFunc}>Add Function</Button>
        </Form>

        {renderSection('Production Logic', logic, setLogic, prodVisual, setProdVisual)}
        {renderSection('Sell Logic', sellLogic, setSellLogic, sellVisual, setSellVisual)}

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={submit}>{editingAuto ? 'Update' : 'Create'}</Button>
          <Button onClick={() => onClose(false)}>Cancel</Button>
        </Space>
      </Space>
    </Modal>
  )
}

export default CreateAutoModal
