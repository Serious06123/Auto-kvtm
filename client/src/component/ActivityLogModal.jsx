const moment = require('moment')
import React, { useEffect, useMemo, useState } from 'react'
import {
    Modal,
    Card,
    Select,
    InputNumber,
    Input,
    Button,
    Space,
    Tag,
    Row,
    Col,
    Popconfirm,
    Empty,
    Spin,
    message,
} from 'antd'
import {
    DeleteOutlined,
    ReloadOutlined,
    CopyOutlined,
    SaveOutlined,
    HistoryOutlined,
} from '@ant-design/icons'
import axios from 'axios'
import { copyTextToClipboard } from './ScreenPointOverlay'

const MODE_OPTIONS = [
    { value: 'on_stop', label: 'Xóa liền sau khi dừng auto' },
    { value: 'hours', label: 'Tự xóa sau số giờ' },
    { value: 'days', label: 'Tự xóa sau số ngày' },
    { value: 'never', label: 'Không tự xóa (chỉ xóa thủ công)' },
]

const STATUS_META = {
    running: { color: 'green', label: 'Đang chạy' },
    finished: { color: 'blue', label: 'Hoàn tất' },
    stopped: { color: 'orange', label: 'Đã dừng' },
    error: { color: 'red', label: 'Lỗi' },
}

const LOG_LEVEL_COLORS = {
    error: '#fca5a5',
    warn: '#fcd34d',
    info: '#e5e7eb',
}

const HOUR_PRESETS = [1, 6, 12, 24]
const DAY_PRESETS = [3, 7, 30]

const ActivityLogModal = ({ open, onClose, initialDeviceId = '' }) => {
    const [loading, setLoading] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)
    const [devices, setDevices] = useState([])
    const [sessions, setSessions] = useState([])
    const [selectedDevice, setSelectedDevice] = useState('ALL')
    const [searchText, setSearchText] = useState('')
    const [activeSessionId, setActiveSessionId] = useState(null)

    const [retentionMode, setRetentionMode] = useState('days')
    const [retentionValue, setRetentionValue] = useState(7)

    const fetchHistory = async (deviceOverride, searchOverride) => {
        const dev = deviceOverride !== undefined ? deviceOverride : selectedDevice
        const q = searchOverride !== undefined ? searchOverride : searchText
        setLoading(true)
        try {
            const { data } = await axios.get('/api/logs/history', {
                params: {
                    deviceId: dev === 'ALL' ? '' : dev,
                    search: q || '',
                    limit: 150,
                },
            })
            const nextSessions = Array.isArray(data?.sessions) ? data.sessions : []
            setDevices(Array.isArray(data?.devices) ? data.devices : [])
            setSessions(nextSessions)
            if (data?.settings) {
                setRetentionMode(data.settings.retentionMode || 'days')
                setRetentionValue(data.settings.retentionValue || 7)
            }
            setActiveSessionId((prev) => {
                if (prev && nextSessions.some((s) => s.id === prev)) return prev
                return nextSessions[0]?.id || null
            })
        } catch (err) {
            message.error('Không tải được lịch sử hoạt động: ' + (err.response?.data?.error || err.message))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!open) return
        const nextDev = initialDeviceId || 'ALL'
        setSelectedDevice(nextDev)
        setSearchText('')
        setActiveSessionId(null)
        fetchHistory(nextDev, '')
    }, [open, initialDeviceId])

    const deviceOptions = useMemo(() => {
        const set = new Set(devices)
        if (selectedDevice && selectedDevice !== 'ALL') set.add(selectedDevice)
        return [
            { value: 'ALL', label: 'Tất cả thiết bị' },
            ...Array.from(set)
                .sort()
                .map((d) => ({ value: d, label: d })),
        ]
    }, [devices, selectedDevice])

    const activeSession = useMemo(
        () => sessions.find((s) => s.id === activeSessionId) || sessions[0] || null,
        [sessions, activeSessionId]
    )

    const handleModeChange = (nextMode) => {
        setRetentionMode(nextMode)
        if (nextMode === 'hours' && (retentionValue < 1 || retentionValue > 720)) {
            setRetentionValue(24)
        } else if (nextMode === 'days' && (retentionValue < 1 || retentionValue > 365)) {
            setRetentionValue(7)
        }
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        try {
            const { data } = await axios.put('/api/logs/settings', {
                retentionMode,
                retentionValue,
            })
            const prunedMsg = data?.prunedCount > 0 ? ` (đã tự dọn ${data.prunedCount} phiên cũ)` : ''
            message.success(`Đã lưu cài đặt tự xóa log${prunedMsg}`)
            fetchHistory()
        } catch (err) {
            message.error('Lưu cài đặt thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setSavingSettings(false)
        }
    }

    const handleClearHistory = async () => {
        try {
            const targetDevice = selectedDevice === 'ALL' ? '' : selectedDevice
            const { data } = await axios.delete('/api/logs/history', {
                params: { deviceId: targetDevice },
            })
            message.success(`Đã xóa ${data?.cleared || 0} phiên lịch sử`)
            fetchHistory()
        } catch (err) {
            message.error('Xóa lịch sử thất bại: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleDeleteSession = async (sessionId) => {
        try {
            await axios.delete('/api/logs/history', {
                params: { sessionId },
            })
            message.success('Đã xóa phiên lịch sử')
            fetchHistory()
        } catch (err) {
            message.error('Xóa phiên thất bại: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleCopySessionLogs = () => {
        if (!activeSession) return
        const entries = Array.isArray(activeSession.entries) ? activeSession.entries : []
        const lines = entries.map((e) => `[${moment(e.ts).format('DD/MM HH:mm:ss')}] ${e.message}`)
        copyTextToClipboard(
            lines.join('\n') || '(Không có dòng log nào)',
            `Đã copy ${entries.length} dòng log của ${activeSession.deviceId}`
        )
    }

    const presets = retentionMode === 'hours' ? HOUR_PRESETS : DAY_PRESETS

    return (
        <Modal
            title={
                <span>
                    <HistoryOutlined /> Lịch sử hoạt động theo từng máy
                </span>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={980}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Card size="small" title="Chính sách tự động xóa log">
                    <Space wrap align="center" size={8}>
                        <Select
                            style={{ width: 250 }}
                            value={retentionMode}
                            onChange={handleModeChange}
                            options={MODE_OPTIONS}
                        />
                        {(retentionMode === 'hours' || retentionMode === 'days') && (
                            <>
                                <InputNumber
                                    min={1}
                                    max={retentionMode === 'hours' ? 720 : 365}
                                    value={retentionValue}
                                    onChange={(v) => setRetentionValue(v ?? 1)}
                                    addonAfter={retentionMode === 'hours' ? 'giờ' : 'ngày'}
                                    style={{ width: 135 }}
                                />
                                <Space size={4}>
                                    {presets.map((val) => (
                                        <Button
                                            key={val}
                                            size="small"
                                            type={retentionValue === val ? 'primary' : 'default'}
                                            ghost={retentionValue === val}
                                            onClick={() => setRetentionValue(val)}
                                        >
                                            {retentionMode === 'hours' ? `${val}h` : `${val} ngày`}
                                        </Button>
                                    ))}
                                </Space>
                            </>
                        )}
                        <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            loading={savingSettings}
                            onClick={handleSaveSettings}
                        >
                            Lưu cài đặt xóa
                        </Button>
                    </Space>
                </Card>

                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Select
                            style={{ width: 220 }}
                            value={selectedDevice}
                            onChange={(val) => {
                                setSelectedDevice(val)
                                fetchHistory(val, searchText)
                            }}
                            options={deviceOptions}
                        />
                        <Input.Search
                            allowClear
                            placeholder="Tìm tên auto, lỗi, nội dung log..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onSearch={(val) => fetchHistory(selectedDevice, val)}
                            style={{ width: 280 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => fetchHistory()}>
                            Làm mới
                        </Button>
                    </Space>

                    <Popconfirm
                        title={
                            selectedDevice === 'ALL'
                                ? 'Xóa toàn bộ lịch sử hoạt động của tất cả thiết bị?'
                                : `Xóa toàn bộ lịch sử của máy ${selectedDevice}?`
                        }
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={handleClearHistory}
                    >
                        <Button danger icon={<DeleteOutlined />} disabled={sessions.length === 0}>
                            {selectedDevice === 'ALL' ? 'Xóa tất cả' : 'Xóa lịch sử máy này'}
                        </Button>
                    </Popconfirm>
                </Space>

                <Spin spinning={loading}>
                    {sessions.length === 0 ? (
                        <Empty description="Chưa có lịch sử hoạt động nào" style={{ padding: '36px 0' }} />
                    ) : (
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={9}>
                                <div
                                    style={{
                                        maxHeight: 420,
                                        overflowY: 'auto',
                                        border: '1px solid #f0f0f0',
                                        borderRadius: 6,
                                        padding: 6,
                                    }}
                                >
                                    {sessions.map((s) => {
                                        const isSelected = activeSession?.id === s.id
                                        const meta = STATUS_META[s.status] || { color: 'default', label: s.status }
                                        const lineCount = Array.isArray(s.entries) ? s.entries.length : 0
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => setActiveSessionId(s.id)}
                                                style={{
                                                    padding: '8px 10px',
                                                    marginBottom: 6,
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    border: isSelected ? '1px solid #1890ff' : '1px solid #f0f0f0',
                                                    backgroundColor: isSelected ? '#e6f4ff' : '#fff',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                                    <strong style={{ fontSize: 12, wordBreak: 'break-all' }}>{s.deviceId}</strong>
                                                    <Tag color={meta.color} style={{ marginRight: 0 }}>{meta.label}</Tag>
                                                </div>
                                                <div style={{ fontSize: 12, color: '#333', marginTop: 2 }}>
                                                    {s.autoName || s.game || 'Auto'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{moment(s.startedAt).format('DD/MM HH:mm:ss')}</span>
                                                    <span>Vòng: {s.loopsCompleted || 0} · {lineCount} dòng</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Col>

                            <Col xs={24} md={15}>
                                {activeSession ? (
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                marginBottom: 8,
                                                padding: '8px 10px',
                                                background: '#fafafa',
                                                border: '1px solid #f0f0f0',
                                                borderRadius: 6,
                                            }}
                                        >
                                            <div style={{ fontSize: 12 }}>
                                                <strong>{activeSession.deviceId}</strong> · {activeSession.autoName || activeSession.game || 'Auto'}
                                                <div style={{ color: '#666', fontSize: 11 }}>
                                                    Bắt đầu: {moment(activeSession.startedAt).format('DD/MM/YYYY HH:mm:ss')}
                                                    {activeSession.endedAt ? ` · Kết thúc: ${moment(activeSession.endedAt).format('HH:mm:ss')}` : ' · Đang chạy'}
                                                </div>
                                            </div>
                                            <Space size={6}>
                                                <Button size="small" icon={<CopyOutlined />} onClick={handleCopySessionLogs}>
                                                    Copy log
                                                </Button>
                                                <Popconfirm
                                                    title="Xóa phiên lịch sử này?"
                                                    okText="Xóa"
                                                    cancelText="Hủy"
                                                    onConfirm={() => handleDeleteSession(activeSession.id)}
                                                >
                                                    <Button size="small" danger icon={<DeleteOutlined />}>
                                                        Xóa phiên này
                                                    </Button>
                                                </Popconfirm>
                                            </Space>
                                        </div>

                                        <div
                                            style={{
                                                background: '#111827',
                                                color: '#e5e7eb',
                                                borderRadius: 6,
                                                padding: 10,
                                                maxHeight: 365,
                                                overflowY: 'auto',
                                                fontFamily: 'Consolas, monospace',
                                                fontSize: 12,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {Array.isArray(activeSession.entries) && activeSession.entries.length > 0 ? (
                                                activeSession.entries.map((entry, idx) => (
                                                    <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        <span style={{ color: '#9ca3af' }}>[{moment(entry.ts).format('HH:mm:ss')}]</span>{' '}
                                                        <span style={{ color: LOG_LEVEL_COLORS[entry.level] || '#e5e7eb' }}>
                                                            {entry.message}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{ color: '#9ca3af' }}>(Phiên này chưa ghi nhận dòng log nào)</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <Empty description="Chọn một phiên ở cột bên trái để xem chi tiết" />
                                )}
                            </Col>
                        </Row>
                    )}
                </Spin>
            </Space>
        </Modal>
    )
}

export default ActivityLogModal
