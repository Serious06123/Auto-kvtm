import React, { useEffect, useState } from 'react'
import { Badge, Button, Space, Tag, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const HealthBar = () => {
    const [health, setHealth] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchHealth = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get('/api/health')
            setHealth(data)
        } catch (err) {
            setHealth(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHealth()
        const timer = setInterval(() => {
            if (!document.hidden) {
                fetchHealth()
            }
        }, 10000)
        return () => clearInterval(timer)
    }, [])

    if (!health) {
        return (
            <Space size={6}>
                <Tag color="default">Hệ thống: Đang kiểm tra...</Tag>
                <Button size="small" type="text" icon={<ReloadOutlined spin={loading} />} onClick={fetchHealth} />
            </Space>
        )
    }

    return (
        <Space size={6} wrap align="center">
            <Tooltip title={`Cổng ADB ${health.adb?.port}: ${health.adb?.ok ? `${health.adb.count} thiết bị kết nối` : 'Không phản hồi'}`}>
                <Tag color={health.adb?.ok ? 'green' : 'red'} style={{ marginInlineEnd: 0 }}>
                    <Badge status={health.adb?.ok ? 'success' : 'error'} text={`ADB :${health.adb?.port} (${health.adb?.count || 0})`} />
                </Tag>
            </Tooltip>

            <Tooltip title={`Appium (${health.appium?.host}:${health.appium?.port}): ${health.appium?.ok ? `Sẵn sàng (${health.appium.latencyMs}ms)` : 'Chưa kết nối'}`}>
                <Tag color={health.appium?.ok ? 'green' : 'red'} style={{ marginInlineEnd: 0 }}>
                    <Badge status={health.appium?.ok ? 'success' : 'error'} text={`Appium :${health.appium?.port}`} />
                </Tag>
            </Tooltip>

            <Tooltip title={health.ocr?.ok ? `Python OCR đang chạy (${health.ocr.latencyMs}ms)` : 'Python OCR đang nghỉ (tự động bật khi chạy Nâng kho)'}>
                <Tag color={health.ocr?.ok ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
                    <Badge status={health.ocr?.ok ? 'success' : 'default'} text={health.ocr?.ok ? 'OCR: Bật' : 'OCR: Nghỉ'} />
                </Tag>
            </Tooltip>

            <Tooltip title={`Đang chạy: ${health.runningDevices} thiết bị | Cache ảnh OpenCV: ${health.cache?.total || 0}/${health.cache?.max || 100}`}>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    RAM: {health.memoryMb} MB
                </Tag>
            </Tooltip>

            <Tooltip title="Làm mới trạng thái hệ thống">
                <Button size="small" type="text" icon={<ReloadOutlined spin={loading} />} onClick={fetchHealth} />
            </Tooltip>
        </Space>
    )
}

export default React.memo(HealthBar)
