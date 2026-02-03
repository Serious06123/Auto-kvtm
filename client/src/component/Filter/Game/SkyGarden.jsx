import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, Col, Row, Select, Button, InputNumber, Flex, Tabs, Divider } from 'antd'
import * as styles from './SkyGarden.module.css'
import axios from 'axios'
import CreateAutoModal from './CreateAutoModal'
import { PlayCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'

const CATS = ['tree', 'vp', 'event', 'other'];

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
  const [selectedByCat, setSelectedByCat] = useState({ tree: null, vp: null, event: null, other: null })

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
      setSelectedByCat({ tree: null, vp: null, event: null, other: null })
      setSelectedAuto('')
    })
  }, [selectedGame])

  const optionsByCat = useMemo(() => {
    const res = { tree: [], vp: [], event: [], other: [] }
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

  // Common select props
  const commonSelectProps = {
    style: { width: '100%' },
    showSearch: true,
    allowClear: true,
    optionFilterProp: 'children',
    filterOption: (input, option) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
    filterSort: (a, b) => (a?.order ?? 0) - (b?.order ?? 0),
  }

  const onChangeByCat = (cat) => (val) => {
    const next = { tree: null, vp: null, event: null, other: null, [cat]: val ?? null }
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

  // Define tabs for categories
  const items = [
    {
      key: 'tree',
      label: 'Plants',
      children: <Select {...commonSelectProps} placeholder="Select Plant Logic..." options={optionsByCat.tree.map(toOption)} value={selectedByCat.tree} onChange={onChangeByCat('tree')} />
    },
    {
      key: 'vp',
      label: 'Items',
      children: <Select {...commonSelectProps} placeholder="Select Item Logic..." options={optionsByCat.vp.map(toOption)} value={selectedByCat.vp} onChange={onChangeByCat('vp')} />
    },
    {
      key: 'event',
      label: 'Events',
      children: <Select {...commonSelectProps} placeholder="Select Event Logic..." options={optionsByCat.event.map(toOption)} value={selectedByCat.event} onChange={onChangeByCat('event')} />
    },
    {
      key: 'other',
      label: 'Others',
      children: <Select {...commonSelectProps} placeholder="Other Logic..." options={optionsByCat.other.map(toOption)} value={selectedByCat.other} onChange={onChangeByCat('other')} />
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Game Control Dashboard</h3>

      <Row style={{ flex: 1 }} gutter={[24, 24]}>
        {/* LEFT COLUMN: TASK SELECTION */}
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>1. Select Task Category</div>
          <Tabs defaultActiveKey="tree" items={items} type="card" />

          <div style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>2. Execution Loop</div>
            <Flex gap="small">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Frequency</div>
                <InputNumber style={{ width: '100%' }} min={1} max={9999} value={frequency} onChange={setFrequency} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Quantity</div>
                <InputNumber style={{ width: '100%' }} min={1} max={9999} value={quantity} onChange={setQuantity} />
              </div>
            </Flex>
          </div>
        </Col>

        {/* RIGHT COLUMN: OPTIONS & ACTIONS */}
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>3. Advanced Options</div>
          <Checkbox.Group style={{ width: '100%' }} onChange={onSelectedGameOption} defaultValue={gameOption}>
            <Row gutter={[8, 8]}>
              <Col span={12}><Checkbox value="openGame">Open Game</Checkbox></Col>
              <Col span={12}><Checkbox value="openChests">Open Chests</Checkbox></Col>
              <Col span={12}><Checkbox value="sellItems">Sell Items</Checkbox></Col>
              <Col span={12}><Checkbox value="removeItems">Remove Items</Checkbox></Col>
              <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>
              <Col span={24}><Checkbox value="kho1">Auto nâng kho 1 (Beta)</Checkbox></Col>
              <Col span={24}><Checkbox value="kho2">Auto nâng kho 2 (Beta)</Checkbox></Col>
            </Row>
          </Checkbox.Group>

          <div style={{ marginTop: 32 }}>
            <Button type="primary" block size="large" icon={<PlayCircleOutlined />} onClick={runAuto} disabled={!selectedAuto} style={{ height: 48, fontSize: 16, marginBottom: 16 }}>
              CHẠY AUTO
            </Button>
            <Flex gap="small">
              <Button block icon={<PlusOutlined />} onClick={() => { setEditingAuto(null); setCreateOpen(true); }}>
                TẠO AUTO MỚI
              </Button>
              <Button block icon={<EditOutlined />} onClick={async () => {
                if (!selectedAuto) return alert('Select a logic first');
                try {
                  const r = await axios.get(`/api/readAuto?key=${selectedAuto}`);
                  setEditingAuto(r.data);
                  setCreateOpen(true);
                } catch (e) { alert(e.message); }
              }} disabled={!selectedAuto}>
                EDIT AUTO
              </Button>
            </Flex>
          </div>
        </Col>
      </Row>

      <CreateAutoModal
        open={createOpen}
        editingAuto={editingAuto}
        onClose={(refresh) => {
          setCreateOpen(false);
          setEditingAuto(null);
          if (refresh) axios.get(`/api/gameOptions?game=${selectedGame}`).then(({ data }) => {
            const sorted = data.map(normalizeCategory).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setAutoOption(sorted);
          })
        }}
        selectedGame={selectedGame}
      />
    </div>
  )
}

export default React.memo(SkyGarden)
