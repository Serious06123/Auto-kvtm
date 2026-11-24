import React, { useEffect, useState } from 'react'
import { Modal, Switch, Input, InputNumber, Checkbox, Button, Space, Divider, Row, Col, message, Spin } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import axios from 'axios'

const EVENT_OPTIONS = [
    { key: 'deviceOffline', label: 'Thiết bị offline / Mất kết nối Appium' },
    { key: 'watchdogFailed', label: 'Watchdog phục hồi thất bại / Vượt giới hạn' },
    { key: 'watchdogRecovered', label: 'Watchdog tự phục hồi thành công' },
    { key: 'sellStalled', label: 'Kẹt bán hàng ban đêm (khởi động lại game)' },
    { key: 'ocrError', label: 'Lỗi OCR nâng kho liên tiếp' },
    { key: 'runFinished', label: 'Hoàn thành toàn bộ số vòng Auto' },
]

const EMPTY_CONFIG = {
    enabled: false,
    telegram: { enabled: false, botToken: '', chatId: '' },
    discord: { enabled: false, webhookUrl: '' },
    events: {
        deviceOffline: true,
        watchdogFailed: true,
        watchdogRecovered: false,
        sellStalled: true,
        runFinished: false,
        ocrError: true,
    },
    cooldownSeconds: 60,
}

const NotifyModal = ({ open, onClose }) => {
    const [config, setConfig] = useState(EMPTY_CONFIG)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        axios
            .get('/api/notify')
            .then(({ data }) => setConfig({ ...EMPTY_CONFIG, ...data }))
            .catch((err) => message.error('Không tải được cấu hình thông báo: ' + err.message))
            .finally(() => setLoading(false))
    }, [open])

    const handleSave = async () => {
        setSaving(true)
        try {
            const { data } = await axios.put('/api/notify', config)
            setConfig(data)
            message.success('Đã lưu cấu hình thông báo')
            onClose()
        } catch (err) {
            message.error('Lưu thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            await axios.put('/api/notify', config)
            const { data } = await axios.post('/api/notify/test')
            if (data.skipped === 'no_channel') {
                message.warning('Vui lòng bật và điền đầy đủ thông tin Telegram hoặc Discord trước khi thử.')
            } else if (data.sent) {
                message.success('Đã gửi thông báo thử nghiệm thành công!')
            } else {
                const errs = (data.results || []).filter((r) => !r.ok).map((r) => `${r.channel}: ${r.error}`).join('; ')
                message.error('Gửi thử thất bại: ' + (errs || 'Kiểm tra lại Token/Webhook'))
            }
        } catch (err) {
            message.error('Lỗi gửi thử: ' + (err.response?.data?.error || err.message))
        } finally {
            setTesting(false)
        }
    }

    const selectedEvents = Object.entries(config.events || {})
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)

    const onEventsChange = (checkedKeys) => {
        const nextEvents = {}
        EVENT_OPTIONS.forEach((ev) => {
            nextEvents[ev.key] = checkedKeys.includes(ev.key)
        })
        setConfig((prev) => ({ ...prev, events: nextEvents }))
    }

    return (
        <Modal
            title="Cài đặt thông báo từ xa (Telegram / Discord)"
            open={open}
            onCancel={onClose}
            width={620}
            footer={[
                <Button key="test" icon={<SendOutlined />} loading={testing} onClick={handleTest}>
                    Gửi thử thông báo
                </Button>,
                <Button key="cancel" onClick={onClose}>
                    Đóng
                </Button>,
                <Button key="save" type="primary" loading={saving} onClick={handleSave}>
                    Lưu
                </Button>,
            ]}
        >
            <Spin spinning={loading}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Kích hoạt hệ thống cảnh báo</strong>
                        <Switch
                            checked={config.enabled}
                            onChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
                            checkedChildren="Bật"
                            unCheckedChildren="Tắt"
                        />
                    </div>

                    <Divider style={{ margin: '4px 0' }} />

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong>Telegram Bot</strong>
                            <Switch
                                size="small"
                                checked={config.telegram?.enabled}
                                onChange={(checked) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        telegram: { ...prev.telegram, enabled: checked },
                                    }))
                                }
                            />
                        </div>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Input.Password
                                placeholder="Bot Token (VD: 123456:ABC-DEF...)"
                                value={config.telegram?.botToken}
                                onChange={(e) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        telegram: { ...prev.telegram, botToken: e.target.value },
                                    }))
                                }
                            />
                            <Input
                                placeholder="Chat ID (VD: -100123456 hoặc 987654321)"
                                value={config.telegram?.chatId}
                                onChange={(e) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        telegram: { ...prev.telegram, chatId: e.target.value },
                                    }))
                                }
                            />
                        </Space>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong>Discord Webhook</strong>
                            <Switch
                                size="small"
                                checked={config.discord?.enabled}
                                onChange={(checked) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        discord: { ...prev.discord, enabled: checked },
                                    }))
                                }
                            />
                        </div>
                        <Input
                            placeholder="https://discord.com/api/webhooks/..."
                            value={config.discord?.webhookUrl}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    discord: { ...prev.discord, webhookUrl: e.target.value },
                                }))
                            }
                        />
                    </div>

                    <Divider style={{ margin: '4px 0' }} />

                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Sự kiện kích hoạt cảnh báo</div>
                        <Checkbox.Group style={{ width: '100%' }} value={selectedEvents} onChange={onEventsChange}>
                            <Row gutter={[8, 8]}>
                                {EVENT_OPTIONS.map((ev) => (
                                    <Col span={24} key={ev.key}>
                                        <Checkbox value={ev.key}>{ev.label}</Checkbox>
                                    </Col>
                                ))}
                            </Row>
                        </Checkbox.Group>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>Chống spam cùng sự kiện (giãn cách tối thiểu):</span>
                        <InputNumber
                            min={0}
                            max={3600}
                            value={config.cooldownSeconds}
                            addonAfter="giây"
                            onChange={(v) => setConfig((prev) => ({ ...prev, cooldownSeconds: v ?? 60 }))}
                        />
                    </div>
                </Space>
            </Spin>
        </Modal>
    )
}

export default NotifyModal
