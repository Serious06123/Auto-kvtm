import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, Col, Row, Select, Button, InputNumber, Flex, Tabs, Divider, notification } from 'antd'
import * as styles from './SkyGarden.module.css'
import axios from 'axios'
import CreateAutoModal from './CreateAutoModal'
import { PlayCircleOutlined, EditOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'

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
  const [khoFrequency, setKhoFrequency] = useState(1) // <- Thêm biến cài đặt tần suất quét kho
  const [gameOption, setGameOption] = useState(['sellItems', 'openChests', 'openGame'])
  const [autoOption, setAutoOption] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState(null)

  const [aiStatus, setAiStatus] = useState({ installed: false, status: 'idle', logs: [] })

  const fetchAiStatus = (prevStatus) => {
    axios.get('/api/ai-status').then(({ data }) => {
      setAiStatus(data)
      if (prevStatus === 'installing' && data.status === 'success') {
        notification.success({
          message: 'CÀI ĐẶT A.I THÀNH CÔNG',
          description: 'Môi trường AI OCR đã được thiết lập thành công. Các tính năng nâng kho đã sẵn sàng!',
          placement: 'bottomRight'
        })
      }
    }).catch(err => console.error('Lỗi khi lấy trạng thái AI:', err))
  }

  useEffect(() => {
    fetchAiStatus()
  }, [])

  useEffect(() => {
    let interval
    if (aiStatus.status === 'installing') {
      interval = setInterval(() => {
        fetchAiStatus('installing')
      }, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [aiStatus.status])

  const handleInstallAi = () => {
    axios.post('/api/install-ai').then(() => {
      fetchAiStatus()
    }).catch(err => {
      alert(err.response?.data?.error || err.message)
    })
  }

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
      sellOtherKho: gameOption.includes('sellOtherKho'),
      frequency: frequency || 1,
      quantity: quantity || 1,
      khoFrequency: khoFrequency || 1, // Kẹp tần suất kho gửi xuống backend
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
              <Col span={24}><Checkbox value="kho1" disabled={!aiStatus.installed}>Auto nâng kho 1 (Beta)</Checkbox></Col>
              <Col span={24}><Checkbox value="kho2" disabled={!aiStatus.installed}>Auto nâng kho 2 (Beta)</Checkbox></Col>
              {!aiStatus.installed && (
                <Col span={24} style={{ color: '#ff4d4f', fontSize: 13, marginTop: 8, marginBottom: 8, background: '#fff1f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>⚠️ Tính năng nâng kho yêu cầu cài đặt mô hình A.I OCR(Máy cần  tầm 1GB ổ đĩa trống).</div>
                  {aiStatus.status === 'installing' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#1890ff' }}>
                        <span className="anticon-spin"><SyncOutlined spin /></span>
                        <span>Đang tải và thiết lập môi trường A.I... Vui lòng đợi (5-15 phút)</span>
                      </div>
                      <div style={{ background: '#1e1e1e', color: '#a9b7c6', padding: '10px', borderRadius: '4px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '11px', whiteSpace: 'pre-wrap', border: '1px solid #323232' }}>
                        {aiStatus.logs.length === 0 ? "Đang khởi tạo trình cài đặt..." : aiStatus.logs.join('')}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button type="primary" danger size="small" onClick={handleInstallAi}>
                        Cài đặt A.I ngay
                      </Button>
                      {aiStatus.status === 'failed' && (
                        <span style={{ marginLeft: 8, color: '#ff4d4f', fontWeight: 'bold' }}>❌ Cài đặt thất bại. Vui lòng thử lại.</span>
                      )}
                    </div>
                  )}
                </Col>
              )}
              {gameOption.includes('kho1') && !gameOption.includes('kho2') && (
                <Col span={24} style={{ paddingLeft: 24, marginTop: -4 }}>
                  <Checkbox value="sellOtherKho" style={{ color: '#eb2f96' }}> Bán vp nâng cấp Kho 2 (Đá, Sơn Vàng, Đinh - 20 lần mỗi món)</Checkbox>
                </Col>
              )}
              {gameOption.includes('kho2') && !gameOption.includes('kho1') && (
                <Col span={24} style={{ paddingLeft: 24, marginTop: -4 }}>
                  <Checkbox value="sellOtherKho" style={{ color: '#eb2f96' }}> Bán vp nâng cấp Kho 1 (Gạch, Sơn Đỏ, Gỗ - 20 lần mỗi món)</Checkbox>
                </Col>
              )}
              <Col span={24}>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, opacity: (gameOption.includes('kho1') || gameOption.includes('kho2')) ? 1 : 0.5 }}>
                  <span style={{ marginRight: 8, fontSize: 13 }}>Kiểm tra Nâng Kho định kỳ sau mỗi: </span>
                  <InputNumber min={1} max={9999} value={khoFrequency} onChange={setKhoFrequency} disabled={!(gameOption.includes('kho1') || gameOption.includes('kho2'))} />
                  <span style={{ marginLeft: 8, fontSize: 13 }}>lần lặp.</span>
                </div>
              </Col>
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
