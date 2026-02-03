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
                setSelectedGame(response.data.listGameOption[0].key)
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
                        <GameOptionsFilter selectedGame={selectedGame} runAuto={runAuto} />
                    </div>
                </Col>
            </Row>
        </>
    )
}

export default React.memo(Filter)
