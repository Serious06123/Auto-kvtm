import React, { useEffect, useState } from 'react'
import { Modal, Tabs, Row, Col, Statistic, Card, Table, Button, Space, Popconfirm, Upload, message, Spin } from 'antd'
import { DownloadOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from 'axios'

const StatsModal = ({ open, onClose }) => {
    const [loading, setLoading] = useState(false)
    const [statsData, setStatsData] = useState(null)
    const [restoring, setRestoring] = useState(false)

    const fetchStats = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get('/api/stats')
            setStatsData(data)
        } catch (err) {
            message.error('Không tải được thống kê: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchStats()
        }
    }, [open])

    const handleResetStats = async () => {
        try {
            const { data } = await axios.delete('/api/stats')
            setStatsData(data)
            message.success('Đã xóa dữ liệu thống kê')
        } catch (err) {
            message.error('Xóa thất bại: ' + err.message)
        }
    }

    const handleExportBackup = async () => {
        try {
            const { data } = await axios.get('/api/backup')
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `auto-kvtm-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
            message.success('Đã xuất file sao lưu cấu hình')
        } catch (err) {
            message.error('Xuất sao lưu thất bại: ' + err.message)
        }
    }

    const handleRestoreUpload = (file) => {
        const reader = new FileReader()
        reader.onload = async () => {
            setRestoring(true)
            try {
                const bundle = JSON.parse(reader.result)
                const { data } = await axios.post('/api/restore', bundle)
                const total = (data.restored?.files?.length || 0) + (data.restored?.autoScripts?.length || 0) + (data.restored?.customImages?.length || 0)
                message.success(`Khôi phục thành công ${total} mục! Tải lại trang (F5) để cập nhật toàn bộ dữ liệu.`)
            } catch (err) {
                message.error('Khôi phục thất bại: ' + (err.response?.data?.error || err.message))
            } finally {
                setRestoring(false)
            }
        }
        reader.readAsText(file)
        return false
    }

    const today = statsData?.today || {}
    const bugs = today.bugsCaught || {}
    const totalBugsToday = Object.values(bugs).reduce((sum, n) => sum + (Number(n) || 0), 0)

    const dayRows = Object.entries(statsData?.days || {})
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, d]) => ({
            date,
            loops: d.loopsCompleted || 0,
            bugs: Object.values(d.bugsCaught || {}).reduce((s, v) => s + (Number(v) || 0), 0),
            restarts: d.restarts || 0,
            recoveries: d.recoveries || 0,
        }))

    const ocrRows = [...(today.ocrHistory || [])].reverse().slice(0, 30)

    const tabItems = [
        {
            key: 'stats',
            label: 'Thống kê hiệu suất',
            children: (
                <Spin spinning={loading}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Row gutter={[12, 12]}>
                            <Col span={6}>
                                <Card size="small">
                                    <Statistic title="Vòng chạy hôm nay" value={today.loopsCompleted || 0} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small">
                                    <Statistic title="Bọ bắt hôm nay" value={totalBugsToday} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small">
                                    <Statistic title="Restart kẹt bán" value={today.restarts || 0} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small">
                                    <Statistic title="Watchdog phục hồi" value={today.recoveries || 0} />
                                </Card>
                            </Col>
                        </Row>

                        <div style={{ fontSize: 12, color: '#666' }}>
                            Chi tiết bọ hôm nay: Ong: <strong>{bugs['ong-vang'] || 0}</strong> | Bướm: <strong>{bugs['buom-hong'] || 0}</strong> | Chuồn chuồn: <strong>{bugs['chuon-chuon'] || 0}</strong>
                        </div>

                        <Table
                            rowKey="date"
                            size="small"
                            bordered
                            pagination={{ pageSize: 5 }}
                            dataSource={dayRows}
                            columns={[
                                { title: 'Ngày', dataIndex: 'date' },
                                { title: 'Vòng chạy', dataIndex: 'loops' },
                                { title: 'Bọ bắt được', dataIndex: 'bugs' },
                                { title: 'Restart game', dataIndex: 'restarts' },
                                { title: 'Watchdog khôi phục', dataIndex: 'recoveries' },
                            ]}
                        />

                        {ocrRows.length > 0 && (
                            <Table
                                rowKey={(r, i) => `${r.time}-${i}`}
                                size="small"
                                bordered
                                pagination={{ pageSize: 5 }}
                                dataSource={ocrRows}
                                columns={[
                                    { title: 'Thời gian', dataIndex: 'time', render: (t) => new Date(t).toLocaleTimeString() },
                                    { title: 'Thiết bị', dataIndex: 'deviceId' },
                                    { title: 'Kho', dataIndex: 'kho', width: 60 },
                                    { title: 'Số liệu OCR', dataIndex: 'value' },
                                ]}
                            />
                        )}

                        <div style={{ textAlign: 'right' }}>
                            <Popconfirm title="Xóa toàn bộ lịch sử thống kê?" onConfirm={handleResetStats}>
                                <Button danger icon={<DeleteOutlined />}>Xóa thống kê</Button>
                            </Popconfirm>
                        </div>
                    </Space>
                </Spin>
            ),
        },
        {
            key: 'backup',
            label: 'Sao lưu & Khôi phục cấu hình',
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="Xuất bản sao lưu toàn bộ cấu hình cá nhân">
                        <p style={{ marginTop: 0, color: '#555' }}>
                            Đóng gói các file cấu hình cá nhân (<code>params_user.json</code>, <code>auto_user.json</code>, <code>custom_const.json</code>, <code>custom_categories.json</code>, <code>profiles.json</code>, <code>scheduler.json</code>), các kịch bản Auto tự tạo và ảnh mẫu tùy chỉnh thành 1 file <code>.json</code>.
                        </p>
                        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportBackup}>
                            Tải bản sao lưu (.json)
                        </Button>
                    </Card>

                    <Card size="small" title="Khôi phục từ file sao lưu">
                        <p style={{ marginTop: 0, color: '#555' }}>
                            Chọn file <code>auto-kvtm-backup-*.json</code> để khôi phục lại toàn bộ cấu hình, script và ảnh mẫu trên máy mới.
                        </p>
                        <Upload accept=".json" showUploadList={false} beforeUpload={handleRestoreUpload}>
                            <Button icon={<UploadOutlined />} loading={restoring}>
                                Chọn file sao lưu để khôi phục
                            </Button>
                        </Upload>
                    </Card>
                </Space>
            ),
        },
    ]

    return (
        <Modal
            title="Thống kê hiệu suất & Sao lưu cấu hình"
            open={open}
            onCancel={onClose}
            width={780}
            footer={[
                <Button key="close" type="primary" onClick={onClose}>
                    Đóng
                </Button>,
            ]}
        >
            <Tabs items={tabItems} />
        </Modal>
    )
}

export default StatsModal
