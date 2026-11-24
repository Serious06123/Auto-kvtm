import React, { useEffect, useState } from 'react'
import { Drawer, Tabs, Table, Button, Space, Input, Select, Switch, InputNumber, Popconfirm, Card, Checkbox, Tag, message, Spin } from 'antd'
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import axios from 'axios'

const SchedulerDrawer = ({ open, onClose, onStarted }) => {
    const [loading, setLoading] = useState(false)
    const [schedules, setSchedules] = useState([])
    const [playlists, setPlaylists] = useState([])
    const [profiles, setProfiles] = useState([])
    const [autoOptions, setAutoOptions] = useState([])
    const [devices, setDevices] = useState([])

    // Schedule form state
    const [schName, setSchName] = useState('')
    const [schTime, setSchTime] = useState('00:05')
    const [schAction, setSchAction] = useState('startProfile')
    const [schTargetId, setSchTargetId] = useState('')
    const [schReplace, setSchReplace] = useState(true)

    // Playlist form state
    const [plName, setPlName] = useState('')
    const [plDevices, setPlDevices] = useState([])
    const [plBasicOpts, setPlBasicOpts] = useState(['openGame', 'openChests', 'sellItems'])
    const [plSteps, setPlSteps] = useState([{ autoKey: '', maxLoops: 10, durationMinutes: 0 }])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [schRes, profRes, optRes, setRes] = await Promise.all([
                axios.get('/api/scheduler'),
                axios.get('/api/profiles'),
                axios.get('/api/gameOptions?game=sky-garden'),
                axios.get('/api/settings'),
            ])
            setSchedules(schRes.data?.schedules || [])
            setPlaylists(schRes.data?.playlists || [])
            setProfiles(Array.isArray(profRes.data) ? profRes.data : [])
            setAutoOptions(Array.isArray(optRes.data) ? optRes.data : [])
            setDevices(setRes.data?.listDevices || [])
        } catch (err) {
            message.error('Không tải được dữ liệu hẹn giờ: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            loadAll()
        }
    }, [open])

    const handleAddSchedule = async () => {
        if (!schName.trim()) return message.warning('Vui lòng nhập tên lịch hẹn')
        if (schAction !== 'stopAll' && !schTargetId) return message.warning('Vui lòng chọn Profile hoặc Playlist đích')
        try {
            const { data } = await axios.post('/api/scheduler/schedules', {
                name: schName.trim(),
                time: schTime.trim(),
                action: schAction,
                targetId: schAction === 'stopAll' ? '' : schTargetId,
                replaceRunning: schReplace,
                enabled: true,
            })
            setSchedules(data.schedules || [])
            setSchName('')
            message.success('Đã lưu lịch hẹn')
        } catch (err) {
            message.error('Lưu lịch hẹn thất bại: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleToggleSchedule = async (record, checked) => {
        try {
            const { data } = await axios.post('/api/scheduler/schedules', {
                ...record,
                enabled: checked,
            })
            setSchedules(data.schedules || [])
        } catch (err) {
            message.error('Cập nhật thất bại: ' + err.message)
        }
    }

    const handleDeleteSchedule = async (id) => {
        try {
            const { data } = await axios.delete(`/api/scheduler/schedules/${encodeURIComponent(id)}`)
            setSchedules(data.schedules || [])
            message.success('Đã xóa lịch hẹn')
        } catch (err) {
            message.error('Xóa thất bại: ' + err.message)
        }
    }

    const handleAddPlaylist = async () => {
        if (!plName.trim()) return message.warning('Vui lòng nhập tên chuỗi Auto')
        const validSteps = plSteps.filter((s) => s.autoKey)
        if (validSteps.length === 0) return message.warning('Vui lòng chọn ít nhất 1 bước Auto')
        try {
            const { data } = await axios.post('/api/scheduler/playlists', {
                name: plName.trim(),
                selectedGame: 'sky-garden',
                deviceIds: plDevices,
                gameOptions: {
                    openGame: plBasicOpts.includes('openGame'),
                    openChests: plBasicOpts.includes('openChests'),
                    sellItems: plBasicOpts.includes('sellItems'),
                    vongQuayHeFree: plBasicOpts.includes('vongQuayHeFree'),
                },
                steps: validSteps,
            })
            setPlaylists(data.playlists || [])
            setPlName('')
            setPlSteps([{ autoKey: '', maxLoops: 10, durationMinutes: 0 }])
            message.success('Đã lưu chuỗi Auto')
        } catch (err) {
            message.error('Lưu chuỗi Auto thất bại: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleDeletePlaylist = async (id) => {
        try {
            const { data } = await axios.delete(`/api/scheduler/playlists/${encodeURIComponent(id)}`)
            setPlaylists(data.playlists || [])
            message.success('Đã xóa chuỗi Auto')
        } catch (err) {
            message.error('Xóa thất bại: ' + err.message)
        }
    }

    const handleRunPlaylist = async (pl) => {
        try {
            await axios.post(`/api/scheduler/playlists/${encodeURIComponent(pl.id)}/run`, {
                deviceIds: pl.deviceIds,
            })
            message.success(`Đã khởi chạy chuỗi "${pl.name}"`)
            onStarted && onStarted()
        } catch (err) {
            message.error('Không thể chạy chuỗi: ' + (err.response?.data?.error || err.message))
        }
    }

    const targetOptions = schAction === 'startProfile'
        ? profiles.map((p) => ({ value: p.id, label: p.name }))
        : schAction === 'startPlaylist'
            ? playlists.map((p) => ({ value: p.id, label: p.name }))
            : []

    const scheduleColumns = [
        { title: 'Tên lịch', dataIndex: 'name' },
        { title: 'Giờ (HH:mm)', dataIndex: 'time', width: 110, render: (t) => <Tag color="blue">{t}</Tag> },
        {
            title: 'Hành động',
            render: (_, r) => {
                if (r.action === 'stopAll') return <Tag color="red">Dừng tất cả thiết bị</Tag>
                if (r.action === 'startProfile') {
                    const p = profiles.find((x) => x.id === r.targetId)
                    return <Tag color="green">Chạy Profile: {p ? p.name : r.targetId}</Tag>
                }
                const pl = playlists.find((x) => x.id === r.targetId)
                return <Tag color="purple">Chạy Playlist: {pl ? pl.name : r.targetId}</Tag>
            },
        },
        {
            title: 'Bật',
            width: 70,
            render: (_, r) => <Switch size="small" checked={r.enabled} onChange={(c) => handleToggleSchedule(r, c)} />,
        },
        {
            title: '',
            width: 60,
            render: (_, r) => (
                <Popconfirm title="Xóa lịch hẹn này?" onConfirm={() => handleDeleteSchedule(r.id)}>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ]

    const playlistColumns = [
        { title: 'Tên chuỗi', dataIndex: 'name' },
        {
            title: 'Các bước nối tiếp',
            render: (_, r) => (
                <Space wrap size={[4, 4]}>
                    {(r.steps || []).map((st, idx) => (
                        <Tag key={idx} color="geekblue">
                            {idx + 1}. {st.autoKey}
                            {st.maxLoops > 0 ? ` (${st.maxLoops} vòng)` : ''}
                            {st.durationMinutes > 0 ? ` (${st.durationMinutes}p)` : ''}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        { title: 'Thiết bị', render: (_, r) => (r.deviceIds || []).join(', ') || 'Chưa gán' },
        {
            title: 'Thao tác',
            width: 150,
            render: (_, r) => (
                <Space>
                    <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleRunPlaylist(r)}>
                        Chạy
                    </Button>
                    <Popconfirm title="Xóa chuỗi Auto này?" onConfirm={() => handleDeletePlaylist(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    const tabItems = [
        {
            key: 'schedules',
            label: 'Lịch hẹn theo giờ',
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="Thêm lịch hẹn tự động (chạy mỗi ngày)">
                        <Space wrap size="small">
                            <Input
                                style={{ width: 170 }}
                                placeholder="Tên (VD: Quay hề 0h05)"
                                value={schName}
                                onChange={(e) => setSchName(e.target.value)}
                            />
                            <Input
                                style={{ width: 95 }}
                                placeholder="HH:mm"
                                value={schTime}
                                onChange={(e) => setSchTime(e.target.value)}
                            />
                            <Select
                                style={{ width: 165 }}
                                value={schAction}
                                onChange={(v) => {
                                    setSchAction(v)
                                    setSchTargetId('')
                                }}
                                options={[
                                    { value: 'startProfile', label: 'Chạy Profile' },
                                    { value: 'startPlaylist', label: 'Chạy Chuỗi (Playlist)' },
                                    { value: 'stopAll', label: 'Dừng tất cả' },
                                ]}
                            />
                            {schAction !== 'stopAll' && (
                                <Select
                                    style={{ width: 200 }}
                                    placeholder="Chọn đích..."
                                    value={schTargetId || undefined}
                                    onChange={setSchTargetId}
                                    options={targetOptions}
                                />
                            )}
                            <Checkbox checked={schReplace} onChange={(e) => setSchReplace(e.target.checked)}>
                                Dừng phiên cũ trước khi chạy
                            </Checkbox>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSchedule}>
                                Thêm lịch
                            </Button>
                        </Space>
                    </Card>
                    <Table rowKey="id" size="small" bordered columns={scheduleColumns} dataSource={schedules} pagination={false} />
                </Space>
            ),
        },
        {
            key: 'playlists',
            label: 'Chuỗi Auto (Playlist)',
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="Tạo chuỗi Auto chạy nối tiếp">
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Space wrap>
                                <Input
                                    style={{ width: 220 }}
                                    placeholder="Tên chuỗi (VD: Bọ -> VP -> Đêm)"
                                    value={plName}
                                    onChange={(e) => setPlName(e.target.value)}
                                />
                                <Select
                                    mode="multiple"
                                    style={{ width: 320 }}
                                    placeholder="Chọn thiết bị áp dụng..."
                                    value={plDevices}
                                    onChange={setPlDevices}
                                    options={devices.map((d) => ({ value: d.value, label: d.label }))}
                                />
                            </Space>
                            <Checkbox.Group
                                value={plBasicOpts}
                                onChange={setPlBasicOpts}
                                options={[
                                    { value: 'openGame', label: 'Open Game' },
                                    { value: 'openChests', label: 'Open Chests' },
                                    { value: 'sellItems', label: 'Sell Items' },
                                    { value: 'vongQuayHeFree', label: 'Vòng quay hề FREE' },
                                ]}
                            />
                            <div style={{ fontWeight: 500, marginTop: 4 }}>Danh sách bước nối tiếp:</div>
                            {plSteps.map((st, idx) => (
                                <Space key={idx} wrap align="center">
                                    <Tag>Bước {idx + 1}</Tag>
                                    <Select
                                        showSearch
                                        style={{ width: 250 }}
                                        placeholder="Chọn kịch bản Auto..."
                                        value={st.autoKey || undefined}
                                        optionFilterProp="label"
                                        onChange={(val) =>
                                            setPlSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, autoKey: val } : x)))
                                        }
                                        options={autoOptions.map((a) => ({ value: a.key, label: a.name }))}
                                    />
                                    <InputNumber
                                        min={0}
                                        max={9999}
                                        value={st.maxLoops}
                                        addonBefore="Số vòng"
                                        style={{ width: 145 }}
                                        onChange={(v) =>
                                            setPlSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, maxLoops: v ?? 0 } : x)))
                                        }
                                    />
                                    <InputNumber
                                        min={0}
                                        max={1440}
                                        value={st.durationMinutes}
                                        addonBefore="Hoặc phút"
                                        style={{ width: 155 }}
                                        onChange={(v) =>
                                            setPlSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, durationMinutes: v ?? 0 } : x)))
                                        }
                                    />
                                    {plSteps.length > 1 && (
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => setPlSteps((prev) => prev.filter((_, i) => i !== idx))}
                                        />
                                    )}
                                </Space>
                            ))}
                            <Space>
                                <Button
                                    icon={<PlusOutlined />}
                                    onClick={() => setPlSteps((prev) => [...prev, { autoKey: '', maxLoops: 10, durationMinutes: 0 }])}
                                >
                                    Thêm bước
                                </Button>
                                <Button type="primary" onClick={handleAddPlaylist}>
                                    Lưu chuỗi Auto
                                </Button>
                            </Space>
                        </Space>
                    </Card>
                    <Table rowKey="id" size="small" bordered columns={playlistColumns} dataSource={playlists} pagination={false} />
                </Space>
            ),
        },
    ]

    return (
        <Drawer title="Bộ hẹn giờ (Scheduler) & Chuỗi Auto (Playlist)" width={860} open={open} onClose={onClose}>
            <Spin spinning={loading}>
                <Tabs items={tabItems} />
            </Spin>
        </Drawer>
    )
}

export default SchedulerDrawer
