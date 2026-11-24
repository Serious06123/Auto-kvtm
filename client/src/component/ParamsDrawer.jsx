import React, { useEffect, useState } from 'react'
import { Drawer, Tabs, InputNumber, Slider, Button, Space, Tooltip, message, Popconfirm, Row, Col, Upload, Switch, Spin } from 'antd'
import { UndoOutlined, QuestionCircleOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import axios from 'axios'

const PRESETS = [
    { label: '1x — Mặc định', value: 1.0 },
    { label: '1.5x — Máy yếu', value: 1.5 },
    { label: '2x — Máy rất yếu', value: 2.0 },
    { label: '3x — Máy cực yếu / game lag', value: 3.0 },
]

const parseBool = (val) => val === true || val === 'true' || val === 1 || val === '1'

const ParamsDrawer = ({ open, onClose }) => {
    const [groups, setGroups] = useState([])
    const [params, setParams] = useState([])
    const [values, setValues] = useState({})
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)

    const load = (data) => {
        setGroups(data.groups)
        setParams(data.params)
        setValues(Object.fromEntries(data.params.map((p) => [p.key, p.value])))
    }

    useEffect(() => {
        if (open) {
            setLoading(true)
            axios.get('/api/params')
                .then(({ data }) => load(data))
                .catch((e) => message.error(e.message))
                .finally(() => setLoading(false))
        }
    }, [open])

    const setVal = (key, v) => setValues((s) => ({ ...s, [key]: v }))

    const save = async () => {
        setSaving(true)
        try {
            const { data } = await axios.put('/api/params', { values })
            load(data)
            message.success('Đã lưu tham số. Có hiệu lực ngay, không cần khởi động lại.')
        } catch (e) {
            message.error('Lưu thất bại: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const resetAll = async () => {
        try {
            const { data } = await axios.delete('/api/params')
            load(data)
            message.success('Đã khôi phục toàn bộ về mặc định')
        } catch (e) {
            message.error('Khôi phục thất bại: ' + e.message)
        }
    }

    const exportJson = () => {
        const diff = {}
        params.forEach((p) => {
            const v = values[p.key] !== undefined ? values[p.key] : p.default
            if (v !== p.default) diff[p.key] = v
        })
        const blob = new Blob([JSON.stringify(diff, null, 4)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'auto-kvtm-params.json'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const importJson = (file) => {
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const obj = JSON.parse(reader.result)
                const next = Object.fromEntries(params.map((p) => [p.key, p.default]))
                Object.entries(obj).forEach(([k, v]) => {
                    if (k in next) {
                        const pDef = params.find((item) => item.key === k)
                        if (pDef?.type === 'boolean') {
                            next[k] = parseBool(v)
                        } else {
                            const n = Number(v)
                            next[k] = isNaN(n) ? pDef?.default : n
                        }
                    }
                })
                setValues(next)
                message.info('Đã nạp file. Bấm "Lưu" để áp dụng.')
            } catch (e) {
                message.error('File không hợp lệ')
            }
        }
        reader.readAsText(file)
        return false
    }

    const renderParam = (p) => {
        const v = values[p.key] !== undefined ? values[p.key] : p.default
        const changed = v !== p.default

        if (p.type === 'boolean') {
            return (
                <Row key={p.key} gutter={12} align="middle" style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Col span={9}>
                        <span style={{ fontWeight: 500 }}>
                            {changed && <span style={{ color: '#fa8c16', marginRight: 4 }}>●</span>}
                            {p.label}
                        </span>
                        {p.description && (
                            <Tooltip title={p.description}>
                                <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                            </Tooltip>
                        )}
                        <div style={{ fontSize: 11, color: '#999' }}>Mặc định: {p.default ? 'Bật' : 'Tắt'}</div>
                    </Col>
                    <Col span={13}>
                        <Switch
                            checked={Boolean(v)}
                            onChange={(checked) => setVal(p.key, checked)}
                            checkedChildren="Bật"
                            unCheckedChildren="Tắt"
                        />
                    </Col>
                    <Col span={2}>
                        <Tooltip title="Khôi phục mặc định">
                            <Button size="small" icon={<UndoOutlined />} disabled={!changed} onClick={() => setVal(p.key, p.default)} />
                        </Tooltip>
                    </Col>
                </Row>
            )
        }

        return (
            <Row key={p.key} gutter={12} align="middle" style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col span={9}>
                    <span style={{ fontWeight: 500 }}>
                        {changed && <span style={{ color: '#fa8c16', marginRight: 4 }}>●</span>}
                        {p.label}
                    </span>
                    {p.description && (
                        <Tooltip title={p.description}>
                            <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                        </Tooltip>
                    )}
                    <div style={{ fontSize: 11, color: '#999' }}>Mặc định: {p.default} {p.unit}</div>
                </Col>
                <Col span={8}>
                    <Slider min={p.min} max={p.max} step={p.step} value={v} onChange={(val) => setVal(p.key, val)} />
                </Col>
                <Col span={5}>
                    <InputNumber
                        style={{ width: '100%' }}
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={v}
                        addonAfter={p.unit}
                        onChange={(val) => val !== null && setVal(p.key, val)}
                    />
                </Col>
                <Col span={2}>
                    <Tooltip title="Khôi phục mặc định">
                        <Button size="small" icon={<UndoOutlined />} disabled={!changed} onClick={() => setVal(p.key, p.default)} />
                    </Tooltip>
                </Col>
            </Row>
        )
    }

    const items = groups.map((g) => {
        const groupParams = params.filter((p) => p.group === g.key)
        const changedCount = groupParams.filter((p) => {
            const v = values[p.key] !== undefined ? values[p.key] : p.default
            return v !== p.default
        }).length

        return {
            key: g.key,
            label: (
                <span>
                    {g.label}
                    {changedCount > 0 && (
                        <span style={{ marginLeft: 6, color: '#fa8c16', fontWeight: 'bold', fontSize: 12 }}>
                            ({changedCount})
                        </span>
                    )}
                </span>
            ),
            children: (
                <div>
                    {g.key === 'global' && (
                        <Space wrap style={{ marginBottom: 12 }}>
                            <span>Chọn nhanh:</span>
                            {PRESETS.map((pr) => (
                                <Button
                                    key={pr.value}
                                    type={values['global.speedMultiplier'] === pr.value ? 'primary' : 'default'}
                                    onClick={() => setVal('global.speedMultiplier', pr.value)}
                                >
                                    {pr.label}
                                </Button>
                            ))}
                        </Space>
                    )}
                    {groupParams.map(renderParam)}
                </div>
            ),
        }
    })

    return (
        <Drawer
            title="Cài đặt tham số (áp dụng cho tất cả giả lập)"
            width={900}
            open={open}
            onClose={onClose}
            extra={
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={exportJson}>Xuất</Button>
                    <Upload accept=".json" showUploadList={false} beforeUpload={importJson}>
                        <Button icon={<UploadOutlined />}>Nhập</Button>
                    </Upload>
                    <Popconfirm title="Khôi phục tất cả tham số về mặc định?" onConfirm={resetAll}>
                        <Button danger>Khôi phục tất cả</Button>
                    </Popconfirm>
                    <Button type="primary" loading={saving} onClick={save}>Lưu</Button>
                </Space>
            }
        >
            <Spin spinning={loading}>
                <Tabs tabPosition="left" items={items} />
            </Spin>
        </Drawer>
    )
}

export default ParamsDrawer
