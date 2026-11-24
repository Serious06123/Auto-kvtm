const moment = require('moment')
import React, { useEffect, useState } from 'react'
import { Col, Row, Select, Flex, notification } from 'antd'
import GameOptionsFilter from './Game'
import * as styles from './Filter.module.css'
import axios from 'axios'

const Filter = (props) => {
    const [selectedDevices, setSelectedDevices] = useState([])
    const [selectedGame, setSelectedGame] = useState('')
    const [devicesOption, setDevicesOption] = useState([])
    const [listGameOption, setListGameOption] = useState([])

    const [api, contextHolder] = notification.useNotification()
    const openNotification = (title, message) => {
        api.error({
            message: title,
            description: message,
            duration: 2,
        })
    }

    const getSettings = () => {
        axios
            .get('/api/settings')
            .then(function (response) {
                setDevicesOption(response.data.listDevices)
                setListGameOption(response.data.listGameOption)
                setSelectedDevices(response.data.listDevices.filter((x) => !x.disabled).map((x) => x.value))
                setSelectedGame((prev) => prev || response.data.listGameOption[0]?.key || '')
            })
    }

    useEffect(() => {
        getSettings()
    }, [props.refreshTime])

    const onSelectedDevice = (value) => {
        setSelectedDevices(value)
    }

    const onSelectedGame = (value) => {
        setSelectedGame(value)
    }

    const runAuto = (gameOptions) => {
        if (selectedDevices.length <= 0) {
            return openNotification('Error Message', 'Please select device!')
        }
        let payload = {
            selectedDevices,
            selectedGame,
            gameOptions,
        }

        axios
            .post('/api/start', payload)
            .then((response) => {
                props.setRefreshTime(moment().format('LTS'))
            })
    }

    const runBatchProfiles = async (profiles) => {
        if (!Array.isArray(profiles) || profiles.length === 0) {
            return openNotification('Thông báo', 'Chưa có Profile nào để chạy!')
        }
        const availableSet = new Set(devicesOption.filter((d) => !d.disabled).map((d) => d.value))
        const claimedDevices = new Set()
        let startedCount = 0

        for (const profile of profiles) {
            const runAutoKey = profile.selectedAuto || profile.gameOptions?.runAuto
            if (!runAutoKey) continue
            const targetGame = profile.selectedGame || selectedGame
            const targetDevices = (profile.deviceIds || []).filter((id) => availableSet.has(id) && !claimedDevices.has(id))
            if (targetDevices.length === 0) continue

            targetDevices.forEach((id) => claimedDevices.add(id))
            const opts = {
                ...(profile.gameOptions || {}),
                runAuto: runAutoKey,
            }
            if (profile.speedMultiplierOverride >= 1) {
                opts.speedMultiplierOverride = profile.speedMultiplierOverride
            }
            try {
                await axios.post('/api/start', {
                    selectedDevices: targetDevices,
                    selectedGame: targetGame,
                    gameOptions: opts,
                })
                startedCount += targetDevices.length
            } catch (err) {
                openNotification('Lỗi chạy Profile', `${profile.name}: ${err.response?.data?.error || err.message}`)
            }
        }

        if (startedCount > 0) {
            api.success({
                message: 'Đã khởi chạy Profile',
                description: `Đã bật tự động cho ${startedCount} thiết bị theo cấu hình Profile.`,
                duration: 3,
            })
            props.setRefreshTime(moment().format('LTS'))
        } else {
            openNotification('Thông báo', 'Không có thiết bị rảnh nào khớp với danh sách thiết bị trong các Profile.')
        }
    }

    return (
        <>
            {contextHolder}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    {/* SETTINGS CARD */}
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 24 }}>System Settings</h3>
                        <Flex vertical gap="large">
                            <div>
                                <div style={{ marginBottom: 8, fontWeight: 500 }}>Select Devices</div>
                                <Select
                                    style={{ width: '100%' }}
                                    mode="multiple"
                                    placeholder="Select connected devices..."
                                    value={selectedDevices}
                                    onChange={onSelectedDevice}
                                    options={devicesOption.map((item) => ({
                                        value: item.value,
                                        label: item.label,
                                        disabled: item.disabled,
                                    }))}
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8, fontWeight: 500 }}>Select Game</div>
                                <Select
                                    style={{ width: '100%' }}
                                    showSearch
                                    placeholder="Search game..."
                                    optionFilterProp="children"
                                    filterOption={(input, option) => (option?.label ?? '').includes(input)}
                                    filterSort={(optionA, optionB) => (optionA?.order ?? 0) - (optionB?.order ?? 0)}
                                    options={listGameOption.map((item) => ({
                                        value: item.key,
                                        label: item.name,
                                        disabled: item.disabled,
                                    }))}
                                    onChange={onSelectedGame}
                                    value={selectedGame}
                                />
                            </div>
                        </Flex>
                    </div>
                </Col>

                <Col xs={24} lg={16}>
                    {/* GAME OPTIONS AREA */}
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', height: '100%' }}>
                        <GameOptionsFilter
                            selectedGame={selectedGame}
                            runAuto={runAuto}
                            selectedDevices={selectedDevices}
                            setSelectedDevices={setSelectedDevices}
                            devicesOption={devicesOption}
                            runBatchProfiles={runBatchProfiles}
                        />
                    </div>
                </Col>
            </Row>
        </>
    )
}

export default React.memo(Filter)
