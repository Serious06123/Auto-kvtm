const moment = require('moment')
import React, { useEffect, useRef, useState } from 'react'
import { Divider, Table, Button, Flex, Popover, Spin, Tag, Space, Tooltip, message } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import LiveScreen from './LiveScreen'
import ImageScreen from './ImageScreen'
import axios from 'axios'
import * as styles from './Table.module.css'

const formatElapsed = (ms) => {
    if (!ms || ms < 0) return '00:00'
    const totalSec = Math.floor(ms / 1000)
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    const pad = (n) => String(n).padStart(2, '0')
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`
}

const RunningTable = (props) => {
    const [runningDevice, setRunningDevice] = useState([])
    const [selectedDevices, setSelectedDevices] = useState([])
    const [liveLogsMap, setLiveLogsMap] = useState({})
    const [activeLogDevice, setActiveLogDevice] = useState(null)
    const [statusMap, setStatusMap] = useState({})
    const [nowTick, setNowTick] = useState(Date.now())
    const [loading, setLoading] = useState(false)
    const [webSocket, setWebSocket] = useState(null)
    const [liveRefreshTime, setLiveRefreshTime] = useState(moment().format('LTS'))
    const logContainerRef = useRef(null)

    const getRunningData = () => {
        axios
            .get('/api/runningDevice')
            .then((response) => {
                setRunningDevice(Array.isArray(response.data) ? response.data : [])
            })
            .catch(() => {})
    }

    useEffect(() => {
        getRunningData()
    }, [props.refreshTime])

    useEffect(() => {
        if (runningDevice.length === 0) return undefined
        const timer = setInterval(() => setNowTick(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [runningDevice.length])

    useEffect(() => {
        let ws = null
        let reconnectTimer = null
        let unmounted = false

        const connect = () => {
            if (unmounted) return
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const socketURL = `${protocol}//${window.location.host}/ws/status`
            ws = new WebSocket(socketURL)

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    if (msg.type === 'snapshot') {
                        setStatusMap(msg.statuses || {})
                    } else if (msg.type === 'status' && msg.data?.deviceId) {
                        setStatusMap((prev) => ({
                            ...prev,
                            [msg.data.deviceId]: msg.data,
                        }))
                    } else if (msg.type === 'log' && msg.data?.deviceId) {
                        const { deviceId, line } = msg.data
                        setLiveLogsMap((prev) => {
                            if (prev[deviceId] === undefined) return prev
                            return { ...prev, [deviceId]: prev[deviceId] + line }
                        })
                    } else if (msg.type === 'removed' && msg.data?.deviceId) {
                        const removedId = msg.data.deviceId
                        setStatusMap((prev) => {
                            const next = { ...prev }
                            delete next[removedId]
                            return next
                        })
                        getRunningData()
                        props.setRefreshTime(moment().format('LTS'))
                    }
                } catch (_) {}
            }

            ws.onclose = () => {
                if (!unmounted) {
                    reconnectTimer = setTimeout(connect, 3000)
                }
            }
        }

        connect()

        return () => {
            unmounted = true
            if (reconnectTimer) clearTimeout(reconnectTimer)
            if (ws) {
                try { ws.close() } catch (_) {}
            }
        }
    }, [])

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [liveLogsMap, activeLogDevice])

    const stopDevice = (device) => {
        axios
            .post('/api/stop', { device })
            .then(() => {
                setSelectedDevices([])
                props.setRefreshTime(moment().format('LTS'))
            })
    }

    const stopAllDevices = () => {
        axios
            .post('/api/stopAll', { listDevices: selectedDevices })
            .then(() => {
                setSelectedDevices([])
                props.setRefreshTime(moment().format('LTS'))
            })
    }

    const togglePause = async (device, currentlyPaused) => {
        const endpoint = currentlyPaused ? '/api/resume' : '/api/pause'
        try {
            await axios.post(endpoint, { device })
        } catch (err) {
            message.error(err.response?.data?.error || err.message)
        }
    }

    const stopGraceful = async (device) => {
        try {
            await axios.post('/api/stopGraceful', { device })
            message.info(`Đã đặt lịch dừng ${device} sau khi xong vòng hiện tại`)
        } catch (err) {
            message.error(err.response?.data?.error || err.message)
        }
    }

    const gameOptionContent = (gameOptions) => {
        let propertyNames = Object.getOwnPropertyNames(gameOptions).filter((x) => x !== 'runAuto')
        return (
            <div>
                {propertyNames.map((propertyName) => (
                    <p key={propertyName}>
                        {propertyName} : {String(gameOptions[propertyName])}
                    </p>
                ))}
            </div>
        )
    }

    const getLogsDevice = (device) => {
        setActiveLogDevice(device)
        setLoading(true)
        axios
            .get(`/api/logs?device=${encodeURIComponent(device)}`)
            .then((response) => {
                const logs = (response.data && response.data.logs) || 'No Content'
                setLiveLogsMap((prev) => ({ ...prev, [device]: logs }))
                setLoading(false)
            })
            .catch(() => {
                setLiveLogsMap((prev) => ({ ...prev, [device]: 'Failed to load logs' }))
                setLoading(false)
            })
    }

    const viewLogContent = (device) => {
        const text = liveLogsMap[device] !== undefined ? liveLogsMap[device] : 'No Content'
        return (
            <>
                {props.onOpenHistory && (
                    <div style={{ marginBottom: 6, textAlign: 'right' }}>
                        <Button size="small" type="link" style={{ padding: 0 }} onClick={() => props.onOpenHistory(device)}>
                            Xem lịch sử máy này →
                        </Button>
                    </div>
                )}
                <Spin spinning={loading} size="small" />
                {!loading && (
                    <div
                        ref={activeLogDevice === device ? logContainerRef : null}
                        style={{
                            maxHeight: 280,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Consolas, monospace',
                            fontSize: 12,
                        }}
                    >
                        {text}
                    </div>
                )}
            </>
        )
    }

    const viewCurrentDevice = (deviceId) => {
        if (typeof MediaSource === 'undefined') {
            return <ImageScreen key={`live-screen-${deviceId}${liveRefreshTime}`} deviceId={deviceId} loading={loading} setLoading={(val) => setLoading(val)} />
        }
        return <LiveScreen key={`live-screen-${deviceId}${liveRefreshTime}`} deviceId={deviceId} webSocketHandler={(ws) => setWebSocket(ws)} />
    }

    const exitLiveScreenHandler = () => {
        webSocket && webSocket.close()
        setLiveRefreshTime(moment().format('LTS'))
    }

    const renderStatus = (record) => {
        const st = statusMap[record.key]
        if (!st) {
            return <Tag color="processing">Đang khởi tạo...</Tag>
        }
        let stateTag = <Tag color="green">Đang chạy</Tag>
        if (st.state === 'paused' || st.isPaused) {
            stateTag = <Tag color="orange">Tạm dừng</Tag>
        } else if (st.state === 'stopping' || st.stopAfterLoop) {
            stateTag = <Tag color="gold">Chờ dừng</Tag>
        } else if (st.state === 'recovering') {
            stateTag = <Tag color="purple">Đang khôi phục</Tag>
        }

        const totalFreq = st.frequency || record.gameOptions?.frequency || '?'
        const elapsed = st.startedAt ? formatElapsed(nowTick - st.startedAt) : '00:00'

        return (
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <Space size={4} wrap>
                    {stateTag}
                    <Tag color="blue">
                        Vòng {st.loopIndex || 0}/{totalFreq}
                    </Tag>
                    <Tag>{elapsed}</Tag>
                    {st.recoveryCount > 0 && <Tag color="volcano">Khôi phục: {st.recoveryCount}</Tag>}
                </Space>
                {st.currentStep && (
                    <div style={{ color: '#555', marginTop: 4 }}>{st.currentStep}</div>
                )}
            </div>
        )
    }

    const columns = [
        {
            title: 'Device',
            width: 170,
            dataIndex: 'deviceName',
        },
        {
            title: 'Game / Auto',
            width: 220,
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{record.game}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{record.runAuto}</div>
                </div>
            ),
        },
        {
            title: 'Trạng thái / Tiến độ',
            width: 290,
            render: (text, record) => renderStatus(record),
        },
        {
            title: 'Action',
            width: 340,
            dataIndex: '',
            render: (text, record) => {
                const st = statusMap[record.key]
                const isPaused = Boolean(st?.isPaused)
                const isStopping = Boolean(st?.stopAfterLoop)
                return (
                    <Space wrap size={[6, 6]} style={{ justifyContent: 'center' }}>
                        <Button className={styles.stopButton} type="primary" danger size="small" onClick={() => stopDevice(record.key)}>
                            Stop
                        </Button>
                        <Tooltip title={isPaused ? 'Tiếp tục chạy' : 'Tạm dừng ở điểm an toàn'}>
                            <Button
                                size="small"
                                icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                type={isPaused ? 'primary' : 'default'}
                                disabled={isStopping}
                                onClick={() => togglePause(record.key, isPaused)}
                            >
                                {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                            </Button>
                        </Tooltip>
                        <Tooltip title="Chạy nốt vòng hiện tại rồi mới dừng">
                            <Button
                                size="small"
                                icon={<ClockCircleOutlined />}
                                disabled={isStopping}
                                onClick={() => stopGraceful(record.key)}
                            >
                                Dừng mềm
                            </Button>
                        </Tooltip>
                        <Popover
                            key={`view-${record.key}`}
                            rootClassName={styles.popupView}
                            placement="leftBottom"
                            content={() => viewCurrentDevice(record.key)}
                            title={`Current screen of ${record.key}`}
                            trigger="click"
                            onOpenChange={(isOpen) => {
                                if (isOpen) {
                                    return
                                }
                                if (typeof MediaSource === 'undefined') {
                                    setLiveRefreshTime(moment().format('LTS'))
                                } else {
                                    exitLiveScreenHandler()
                                }
                            }}
                        >
                            <Button className={styles.viewButton} type="primary" size="small">
                                View
                            </Button>
                        </Popover>
                        <Popover
                            key={`log-${record.key}`}
                            rootClassName={styles.popupLogs}
                            placement="leftBottom"
                            content={() => viewLogContent(record.key)}
                            title={`Log of ${record.key} (Realtime)`}
                            trigger="click"
                            onOpenChange={(isOpen) => {
                                if (!isOpen && activeLogDevice === record.key) {
                                    setActiveLogDevice(null)
                                }
                            }}
                        >
                            <Button className={styles.logButton} type="primary" size="small" onClick={() => getLogsDevice(record.key)}>
                                Logs
                            </Button>
                        </Popover>
                        <Popover
                            key={`view-detail-${record.key}`}
                            rootClassName={styles.popupDetail}
                            placement="leftBottom"
                            content={gameOptionContent(record.gameOptions)}
                            title={`Game Option of ${record.key}`}
                            trigger="click"
                        >
                            <Button className={styles.detailButton} type="primary" size="small">
                                Detail
                            </Button>
                        </Popover>
                    </Space>
                )
            },
        },
    ]

    const rowSelection = {
        selectedRowKeys: selectedDevices,
        type: 'checkbox',
        onChange: (selectedRowKeys) => {
            setSelectedDevices(selectedRowKeys)
        },
        getCheckboxProps: (record) => ({
            disabled: record.name === 'Disabled User',
            name: record.name,
        }),
    }

    return (
        <>
            <Divider></Divider>
            <Table
                key="running table"
                title={() => (
                    <Flex gap="middle" justify="space-between" align="center" vertical={false}>
                        <label style={{ fontSize: 20, fontWeight: 500 }}>Running Devices</label>
                        <Button disabled={selectedDevices.length <= 0} type="primary" danger onClick={stopAllDevices}>
                            Stop All
                        </Button>
                    </Flex>
                )}
                bordered={true}
                rowSelection={rowSelection}
                columns={columns}
                dataSource={runningDevice.map((item) => ({
                    ...item,
                    key: item.device,
                }))}
                rowKey={(record) => record.key}
                pagination={{ position: ['bottomCenter'], pageSize: 5 }}
            />
        </>
    )
}

export default React.memo(RunningTable)
