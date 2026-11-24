import React, { useState } from 'react'
import { Button, Card, Space, Tag, message } from 'antd'
import { CopyOutlined, AimOutlined } from '@ant-design/icons'
import axios from 'axios'

export async function copyTextToClipboard(text, successMsg = 'Đã copy!') {
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text)
            message.success(successMsg)
            return true
        }
    } catch (_) {
        // Fallback below for non-HTTPS origins
    }

    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.top = '-9999px'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (ok) {
            message.success(successMsg)
            return true
        }
    } catch (_) {
        // Ignore fallback failure
    }
    message.error('Không thể copy vào clipboard')
    return false
}

export function computeScreenPoint(imgEl, clientX, clientY) {
    if (!imgEl) return null
    const rect = imgEl.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return null

    const rawXPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const rawYPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    const xPct = Number(rawXPct.toFixed(1))
    const yPct = Number(rawYPct.toFixed(1))
    const x1000 = Math.round(xPct * 10)
    const y1000 = Math.round(yPct * 10)
    const naturalWidth = imgEl.naturalWidth || 0
    const naturalHeight = imgEl.naturalHeight || 0
    const natX = naturalWidth > 0 ? Math.max(0, Math.min(naturalWidth - 1, Math.round((naturalWidth * xPct) / 100))) : null
    const natY = naturalHeight > 0 ? Math.max(0, Math.min(naturalHeight - 1, Math.round((naturalHeight * yPct) / 100))) : null

    return {
        xPct,
        yPct,
        x1000,
        y1000,
        natX,
        natY,
        naturalWidth,
        naturalHeight,
    }
}

export const CrosshairMarker = ({ point }) => {
    if (!point) return null
    const labelNearRight = point.xPct > 72
    const labelNearTop = point.yPct < 10
    return (
        <div
            style={{
                position: 'absolute',
                left: `${point.xPct}%`,
                top: `${point.yPct}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 10,
            }}
        >
            <div
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#ff4d4f',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.45)',
                }}
            />
            <span
                style={{
                    position: 'absolute',
                    left: labelNearRight ? 'auto' : 10,
                    right: labelNearRight ? 10 : 'auto',
                    top: labelNearTop ? 12 : -22,
                    background: 'rgba(0, 0, 0, 0.78)',
                    color: '#fff',
                    fontSize: 11,
                    padding: '1px 5px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                }}
            >
                {point.xPct}%, {point.yPct}%
            </span>
        </div>
    )
}

export const ScreenPointPanel = ({ point, deviceId, compact = false }) => {
    const [tapping, setTapping] = useState(false)
    if (!point) return null

    const handleTapTest = async () => {
        if (!deviceId) {
            return message.warning('Chưa có thiết bị được chọn để chạm thử')
        }
        setTapping(true)
        try {
            const { data } = await axios.post('/api/device/tap', {
                deviceId,
                x: point.xPct,
                y: point.yPct,
            })
            message.success(`Đã chạm thử lên ${deviceId} tại (${data.pxX}, ${data.pxY}) px`)
        } catch (err) {
            message.error('Chạm thử thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setTapping(false)
        }
    }

    const tapSnippet = `await driver.tap(${point.xPct}, ${point.yPct})`
    const pctText = `${point.xPct}, ${point.yPct}`
    const normText = `${point.x1000}, ${point.y1000}`

    const content = (
        <Space direction="vertical" style={{ width: '100%' }} size={compact ? 6 : 8}>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div>
                    <Tag color="red">%</Tag>
                    <strong>({point.xPct}%, {point.yPct}%)</strong>
                </div>
                <div>
                    <Tag color="blue">1000×1000</Tag>
                    <strong>({point.x1000}, {point.y1000})</strong>
                </div>
                {point.natX !== null && point.natY !== null && (
                    <div>
                        <Tag color="default">Pixel gốc</Tag>
                        <span>
                            ({point.natX}, {point.natY}) / {point.naturalWidth}×{point.naturalHeight}
                        </span>
                    </div>
                )}
            </div>
            <Space wrap size={6}>
                <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyTextToClipboard(tapSnippet, `Đã copy: ${tapSnippet}`)}
                >
                    Copy driver.tap(x, y)
                </Button>
                <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyTextToClipboard(pctText, `Đã copy %: ${pctText}`)}
                >
                    Copy %
                </Button>
                {!compact && (
                    <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyTextToClipboard(normText, `Đã copy 1000×1000: ${normText}`)}
                    >
                        Copy 1000×1000
                    </Button>
                )}
                <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<AimOutlined />}
                    loading={tapping}
                    disabled={!deviceId}
                    onClick={handleTapTest}
                >
                    {compact ? 'Chạm thử' : 'Chạm thử lên thiết bị'}
                </Button>
            </Space>
        </Space>
    )

    if (compact) {
        return (
            <div
                style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                }}
            >
                {content}
            </div>
        )
    }

    return (
        <Card size="small" title="Tọa độ điểm ảnh (chuột phải)">
            {content}
        </Card>
    )
}
