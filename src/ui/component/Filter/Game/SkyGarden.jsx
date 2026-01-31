import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, Col, Row, Select, Button, InputNumber, Flex } from 'antd'
import * as styles from './SkyGarden.module.css'
import axios from 'axios'
import CreateAutoModal from './CreateAutoModal'

const CATS = ['tree', 'vp', 'event'];

// Suy ra "event" nếu thiếu category (từ dữ liệu bạn gửi)
const normalizeCategory = (item) => {
  if (item.category) return item;
  const k = (item.key || '').toLowerCase();
  const isEvent =
    k.includes('vpsk') ||
    k.includes('trong-cay-sk') ||
    k.includes('thanh-tuu') ||
    k.includes('chuyen-vpsk') ||
    k.includes('xa-vpsk');
  return { ...item, category: isEvent ? 'event' : item.category };
};

const SkyGarden = (props) => {
  const { selectedGame } = props

  const [selectedAuto, setSelectedAuto] = useState('') // gửi lên backend
  const [selectedByCat, setSelectedByCat] = useState({ tree: null, vp: null, event: null })

  const [frequency, setFrequency] = useState(9999)
  const [quantity, setQuantity] = useState(9999)
  const [gameOption, setGameOption] = useState(['sellItems', 'openChests', 'openGame'])
  const [autoOption, setAutoOption] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState(null)

  useEffect(() => {
    axios.get(`/api/gameOptions?game=${selectedGame}`).then(({ data }) => {
      const sorted = data.map(normalizeCategory).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setAutoOption(sorted)
      // Không chọn gì mặc định
      setSelectedByCat({ tree: null, vp: null, event: null })
      setSelectedAuto('')
    })
  }, [selectedGame])

  const optionsByCat = useMemo(() => {
    const res = { tree: [], vp: [], event: [] }
    for (const it of autoOption) {
      if (CATS.includes(it.category)) res[it.category].push(it)
    }
    return res
  }, [autoOption])

  const toOption = (item) => ({
    value: item.key,
    label: item.name + (item.recommend ? ' (★)' : ''),
    disabled: item.disabled,
    order: item.order ?? 0,
  })

  const commonSelectProps = {
    className: styles.selectAuto,
    size: 'small',
    showSearch: true,
    allowClear: true,
    placeholder: 'Select',
    optionFilterProp: 'children',
    filterOption: (input, option) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
    filterSort: (a, b) => (a?.order ?? 0) - (b?.order ?? 0),
  }

  // Chỉ cho chọn 1 trong 3
  const onChangeByCat = (cat) => (val) => {
    const next = { tree: null, vp: null, event: null, [cat]: val ?? null }
    setSelectedByCat(next)
    setSelectedAuto(val || '')
  }

  const onSelectedGameOption = (value) => setGameOption(value)

  const runAuto = () => {
    const data = {
      runAuto: selectedAuto,
      openGame: gameOption.includes('openGame'),
      openChests: gameOption.includes('openChests'),
      sellItems: gameOption.includes('sellItems'),
      removeItems: gameOption.includes('removeItems'),
      kho1: gameOption.includes('kho1'),
      kho2: gameOption.includes('kho2'),
      frequency: frequency || 1,
      quantity: quantity || 1,
    }
    props.runAuto(data)
  }

  return (
    <>
      <Col className="gutter-row" xs={24} sm={24} xl={14} xxl={14}>
        <h3>Game Option</h3>
        <Row>
          <Checkbox.Group style={{ width: '100%' }} onChange={onSelectedGameOption} defaultValue={gameOption}>
            <Row gutter={[40, 20]}>
              <Col className="gutter-row" xs={24} sm={24} xl={18} xxl={18}>
                <Flex align="center" gap={12} wrap={false} justify="start">
                  <label className={styles.runAutoLabel}>Run Auto</label>

                  {/* TREE */}
                  <Select
                    {...commonSelectProps}
                    popupMatchSelectWidth={false}
                    popupClassName={styles.selectPopup}
                    placeholder="Tree"
                    options={optionsByCat.tree.map(toOption)}
                    value={selectedByCat.tree ?? undefined}
                    onChange={onChangeByCat('tree')}
                  />

                  {/* VP */}
                  <Select
                    {...commonSelectProps}
                    popupMatchSelectWidth={false}
                    popupClassName={styles.selectPopup}
                    placeholder="VP"
                    options={optionsByCat.vp.map(toOption)}
                    value={selectedByCat.vp ?? undefined}
                    onChange={onChangeByCat('vp')}
                  />

                  {/* EVENT */}
                  <Select
                    {...commonSelectProps}
                    popupMatchSelectWidth={false}
                    popupClassName={styles.selectPopup}
                    placeholder="Event"
                    options={optionsByCat.event.map(toOption)}
                    value={selectedByCat.event ?? undefined}
                    onChange={onChangeByCat('event')}
                  />
                </Flex>
              </Col>

              <Col className="gutter-row" xs={24} sm={24} xl={24} xxl={24}>
                <Row gutter={[40, 20]}>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="openGame">Open Game</Checkbox>
                  </Col>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="openChests">Open Chests</Checkbox>
                  </Col>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="sellItems">Sell Items</Checkbox>
                  </Col>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="removeItems">Remove Items</Checkbox>
                  </Col>
                </Row>
                <Row gutter={[40, 20]}>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="kho1">Auto nâng kho 1</Checkbox>
                  </Col>
                  <Col xs={12} sm={6} xl={6}>
                    <Checkbox value="kho2">Auto nâng kho 2</Checkbox>
                  </Col>
                </Row>
              </Col>

              <Col xs={12} sm={12} xl={12} xxl={12}>
                <Flex gap="middle" align="center" vertical={false}>
                  <label>Frequency</label>
                  <InputNumber
                    className={styles.inputNumber}
                    min={1}
                    max={9999}
                    value={frequency}
                    onChange={(v) => setFrequency(v)}
                  />
                  <label>Quantity</label>
                  <InputNumber
                    className={styles.inputNumber}
                    min={1}
                    max={9999}
                    value={quantity}
                    onChange={(v) => setQuantity(v)}
                  />
                </Flex>
              </Col>

              <Col>
                <Button type="primary" onClick={runAuto} disabled={!selectedAuto}>
                  Run now!
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { setEditingAuto(null); setCreateOpen(true); }}>
                  Create Auto
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={async () => {
                  if (!selectedAuto) return alert('Please select an auto to edit')
                  try {
                    const r = await axios.get(`/api/readAuto?key=${selectedAuto}`)
                    setEditingAuto(r.data)
                    setCreateOpen(true)
                  } catch (e) {
                    alert('Cannot read auto: ' + (e.message || ''))
                  }
                }} disabled={!selectedAuto}>
                  Edit Auto
                </Button>
                <CreateAutoModal open={createOpen} editingAuto={editingAuto} onClose={(refresh) => { setCreateOpen(false); setEditingAuto(null); if (refresh) axios.get(`/api/gameOptions?game=${selectedGame}`).then(({ data }) => { const sorted = data.map(normalizeCategory).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); setAutoOption(sorted); }) }} selectedGame={selectedGame} />
              </Col>
            </Row>
          </Checkbox.Group>
        </Row>
      </Col>
    </>
  )
}

export default React.memo(SkyGarden)
