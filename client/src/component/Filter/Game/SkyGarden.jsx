import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, Col, Row, Select, Button, InputNumber, Flex, Tabs, Divider, notification, message, Modal, Input } from 'antd'
import * as styles from './SkyGarden.module.css'
import axios from 'axios'
import CreateAutoModal from './CreateAutoModal'
import { PlayCircleOutlined, EditOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'

// const CATS is no longer static. We determine categories dynamically from the auto options.

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
  const [selectedByCat, setSelectedByCat] = useState({})

  const [frequency, setFrequency] = useState(9999)
  const [quantity, setQuantity] = useState(9999)
  const [khoFrequency, setKhoFrequency] = useState(1) // <- Thêm biến cài đặt tần suất quét kho
  const [openGameFrequency, setOpenGameFrequency] = useState(50)
  const [noRestartIfOpen, setNoRestartIfOpen] = useState(true)
  const [noRestartPeriodic, setNoRestartPeriodic] = useState(false)
  const [giaoHangCuFrequency, setGiaoHangCuFrequency] = useState(1)
  const [giaoHangCuDailyFree, setGiaoHangCuDailyFree] = useState(true)
  const [giaoHangCuDailyGem, setGiaoHangCuDailyGem] = useState(false)
  const [giaoHangCuRegular, setGiaoHangCuRegular] = useState(true)
  const [giaoHangCuDeleteInvalid, setGiaoHangCuDeleteInvalid] = useState(false)
  const [giaoHangCuReactivateGem, setGiaoHangCuReactivateGem] = useState(false)
  const [gameOption, setGameOption] = useState(['sellItems', 'openChests', 'openGame'])
  const [autoOption, setAutoOption] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState(null)

  const [aiStatus, setAiStatus] = useState({ installed: false, status: 'idle', logs: [] })

  const [customCategories, setCustomCategories] = useState([])
  const [newCatModalOpen, setNewCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

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
    axios.get('/api/customCategories')
      .then(({ data }) => setCustomCategories(data))
      .catch(err => console.error('Lỗi khi tải danh mục:', err))
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
      setSelectedByCat({})
      setSelectedAuto('')
    })
  }, [selectedGame])

  const uniqueCats = useMemo(() => {
    const catsSet = new Set([
      'tree', 'vp', 'event', 'other',
      ...customCategories,
      ...autoOption.map(x => x.category || 'other')
    ])
    catsSet.delete('')
    const order = ['tree', 'vp', 'event', 'other']
    const sortedCats = Array.from(catsSet).sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
    return sortedCats
  }, [autoOption, customCategories])

  const handleCreateCategory = () => {
    if (!newCatName) return message.error('Category name cannot be empty')
    const cleanName = newCatName.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim()
    if (!cleanName) return message.error('Invalid category name')
    if (uniqueCats.includes(cleanName)) {
        return message.error('Category already exists!')
    }
    axios.post('/api/customCategories', { category: cleanName })
      .then(({ data }) => {
        setCustomCategories(data.categories)
        setNewCatName('')
        setNewCatModalOpen(false)
        message.success(`Category "${cleanName.toUpperCase()}" created successfully!`)
      })
      .catch(err => {
        message.error('Failed to create category: ' + (err.response?.data?.error || err.message))
      })
  }

  const handleEditTab = (targetKey, action) => {
    if (action === 'add') {
      setNewCatModalOpen(true)
    }
  }

  const optionsByCat = useMemo(() => {
    const res = {}
    for (const cat of uniqueCats) {
      res[cat] = []
    }
    for (const it of autoOption) {
      const cat = it.category || 'other'
      if (res[cat]) res[cat].push(it)
    }
    return res
  }, [autoOption, uniqueCats])

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
    setSelectedByCat({ [cat]: val ?? null })
    setSelectedAuto(val || '')
  }

  const onSelectedGameOption = (value) => setGameOption(value)

  const runAuto = () => {
    const data = {
      runAuto: selectedAuto,
      openGame: gameOption.includes('openGame'),
      openChests: gameOption.includes('openChests'),
      vongQuayHeFree: gameOption.includes('vongQuayHeFree'),
      sellItems: gameOption.includes('sellItems'),
      removeItems: gameOption.includes('removeItems'),
      kho1: gameOption.includes('kho1'),
      kho2: gameOption.includes('kho2'),
      sellOtherKho: gameOption.includes('sellOtherKho'),
      giaoHangCu: gameOption.includes('giaoHangCu'),
      giaoHangCuFrequency: giaoHangCuFrequency || 1,
      giaoHangCuDailyFree: giaoHangCuDailyFree,
      giaoHangCuDailyGem: giaoHangCuDailyGem,
      giaoHangCuRegular: giaoHangCuRegular,
      giaoHangCuDeleteInvalid: giaoHangCuDeleteInvalid,
      giaoHangCuReactivateGem: giaoHangCuReactivateGem,
      frequency: frequency || 1,
      quantity: quantity || 1,
      khoFrequency: khoFrequency || 1, // Kẹp tần suất kho gửi xuống backend
      openGameFrequency: openGameFrequency || 50,
      noRestartIfOpen: noRestartIfOpen,
      noRestartPeriodic: noRestartPeriodic,
    }
    props.runAuto(data)
  }

  // Define tabs for categories dynamically
  const items = useMemo(() => {
    return uniqueCats.map(cat => {
      const label = cat.toUpperCase()
      return {
        key: cat,
        label: label,
        closable: false,
        children: (
          <Select 
            {...commonSelectProps} 
            placeholder={`Select ${label} Logic...`} 
            options={(optionsByCat[cat] || []).map(toOption)} 
            value={selectedByCat[cat] || null} 
            onChange={onChangeByCat(cat)} 
          />
        )
      }
    })
  }, [uniqueCats, optionsByCat, selectedByCat])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Game Control Dashboard</h3>

      <Row style={{ flex: 1 }} gutter={[24, 24]}>
        {/* LEFT COLUMN: TASK SELECTION */}
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>1. Select Task Category</div>
          <Tabs 
            defaultActiveKey={uniqueCats[0] || 'tree'} 
            items={items} 
            type="editable-card" 
            hideAdd={false}
            onEdit={handleEditTab}
          />

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
              <Col span={12}><Checkbox value="giaoHangCu">Giao Hàng Cú</Checkbox></Col>
              <Col span={12}><Checkbox value="vongQuayHeFree">Vòng Quay Chú Hề FREE</Checkbox></Col>
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

          {gameOption.includes('openGame') && (
            <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
              <Col span={24}>
                <Checkbox checked={noRestartIfOpen} onChange={e => setNoRestartIfOpen(e.target.checked)}>
                  Không khởi động lại nếu game đã mở sẵn khi bắt đầu chạy
                </Checkbox>
              </Col>
              <Col span={24}>
                <Checkbox checked={noRestartPeriodic} onChange={e => setNoRestartPeriodic(e.target.checked)}>
                  Không khởi động lại ở chu kỳ định kỳ (nếu game vẫn đang hoạt động)
                </Checkbox>
              </Col>
              <Col span={24}>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ marginRight: 8, fontSize: 13 }}>Tự động kiểm tra/mở lại game sau mỗi: </span>
                  <InputNumber min={1} max={9999} value={openGameFrequency} onChange={setOpenGameFrequency} />
                  <span style={{ marginLeft: 8, fontSize: 13 }}>lần lặp.</span>
                </div>
              </Col>
            </Row>
          )}

          {gameOption.includes('giaoHangCu') && (
            <Row gutter={[8, 8]} style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid #1890ff' }}>
              <Col span={24}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ marginRight: 8, fontSize: 13 }}>Kiểm tra Giao Hàng Cú sau mỗi: </span>
                  <InputNumber min={1} max={9999} value={giaoHangCuFrequency} onChange={setGiaoHangCuFrequency} />
                  <span style={{ marginLeft: 8, fontSize: 13 }}>lần lặp.</span>
                </div>
              </Col>
              <Col span={24}>
                <Checkbox checked={giaoHangCuDailyFree} onChange={e => setGiaoHangCuDailyFree(e.target.checked)}>
                  Giao đơn hàng hằng ngày (Free)
                </Checkbox>
              </Col>
              <Col span={24}>
                <Checkbox checked={giaoHangCuDailyGem} onChange={e => setGiaoHangCuDailyGem(e.target.checked)}>
                  Giao đơn hàng hằng ngày (Kim cương)
                </Checkbox>
              </Col>
              <Col span={24}>
                <Checkbox checked={giaoHangCuRegular} onChange={e => setGiaoHangCuRegular(e.target.checked)}>
                  Giao đơn thường đã đủ điều kiện
                </Checkbox>
              </Col>
              <Col span={24}>
                <Checkbox checked={giaoHangCuDeleteInvalid} onChange={e => setGiaoHangCuDeleteInvalid(e.target.checked)}>
                  Hủy đơn thường không đủ điều kiện
                </Checkbox>
              </Col>
              <Col span={24}>
                <Checkbox checked={giaoHangCuReactivateGem} onChange={e => setGiaoHangCuReactivateGem(e.target.checked)}>
                  Dùng kim cương kích hoạt lại đơn hàng thường đang chờ
                </Checkbox>
              </Col>
            </Row>
          )}

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
        categories={uniqueCats}
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

      <Modal
        title="Thêm nhóm mới (Task Category)"
        open={newCatModalOpen}
        onOk={handleCreateCategory}
        onCancel={() => { setNewCatName(''); setNewCatModalOpen(false); }}
        okText="Thêm"
        cancelText="Hủy"
      >
        <Input 
          placeholder="Nhập tên nhóm mới (ví dụ: bo, mini, sk)" 
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)} 
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  )
}

export default React.memo(SkyGarden)
