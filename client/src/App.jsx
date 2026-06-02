const moment = require('moment')
import React, { useState, useEffect } from 'react'
import { Layout, ConfigProvider, notification, Button } from 'antd'
const { Header, Content, Footer } = Layout
import { SyncOutlined } from '@ant-design/icons'
import axios from 'axios'
import * as styles from './App.module.css'

import Filter from './component/Filter/Filter'
import Table from './component/Content/Table'
import UploadImage from './component/UploadImage'

const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/Serious06123/Auto-kvtm/main/package.json'

const App = (props) => {
    const [refreshTime, setRefreshTime] = useState(moment().format('LTS'))
    const [updating, setUpdating] = useState(false)

    const performUpdate = async () => {
        setUpdating(true)
        const loadingKey = 'app-updating'
        notification.open({
            key: loadingKey,
            message: 'ĐANG CẬP NHẬT',
            description: 'Đang tải bản cập nhật mới nhất từ GitHub và build lại ứng dụng. Vui lòng không tắt tool...',
            duration: 0,
            icon: <SyncOutlined spin />
        })

        try {
            const { data } = await axios.post('/api/updateApp')
            notification.success({
                message: 'CẬP NHẬT THÀNH CÔNG',
                description: data.message || 'Vui lòng F5 trang web.',
                duration: 10,
            })
        } catch (error) {
            notification.error({
                message: 'CẬP NHẬT THẤT BẠI',
                description: error.response?.data?.error || error.message,
                duration: 10,
            })
        } finally {
            notification.destroy(loadingKey)
            setUpdating(false)
        }
    }

    const handleCheckUpdate = async (manual = false) => {
        try {
            // Thêm timestamp để tránh cache
            const response = await axios.get(`${UPDATE_CHECK_URL}?t=${new Date().getTime()}`)
            const remoteVersion = response.data.version

            if (remoteVersion && remoteVersion !== __APP_VERSION__) {
                const key = `open${Date.now()}`
                const btn = (
                    <Button type="primary" size="small" onClick={() => {
                        notification.destroy(key)
                        performUpdate()
                    }} disabled={updating}>
                        Cập nhật ngay
                    </Button>
                )
                notification.info({
                    message: 'CÓ BẢN CẬP NHẬT MỚI',
                    description: `Phiên bản mới (v${remoteVersion}) đã sẵn sàng. Phiên bản bạn đang cài: v${__APP_VERSION__}.`,
                    placement: 'bottomRight',
                    btn,
                    key,
                    duration: 0,
                })
            } else if (manual) {
                notification.success({
                    message: 'ĐÃ LÀ BẢN MỚI NHẤT',
                    description: `Version v${__APP_VERSION__} bạn đang dùng là bản cập nhật mới nhất từ nhà phát triển.`,
                    placement: 'bottomRight',
                    duration: 5,
                })
            }
        } catch (error) {
            console.error('Không thể kiểm tra cập nhật:', error)
            if (manual) {
                notification.error({
                    message: 'LỖI ĐƯỜNG TRUYỀN',
                    description: 'Kết nối tới máy chủ GitHub thất bại, hãy tải lại trang.',
                    placement: 'bottomRight',
                })
            }
        }
    }

    useEffect(() => {
        handleCheckUpdate(false)
    }, [])

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#1890ff', // Standard Ant Blue
                    borderRadius: 6,
                    fontFamily: "'Inter', sans-serif"
                },
                components: {
                    Layout: {
                        colorBgHeader: '#fff',
                        colorBgBody: '#f0f2f5',
                    },
                    Card: {
                        boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
                    }
                }
            }}
        >
            <Layout className={styles.layout}>
                <Header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <h1 className={styles.title}>Auto Tools</h1>
                            <span className={styles.subtitle}>Manager</span>
                        </div>
                        <Button 
                            type="dashed" 
                            size="small" 
                            icon={<SyncOutlined />} 
                            onClick={() => handleCheckUpdate(true)}
                            title="Vào kho xem có bản Update nào không"
                        >
                            Kiểm tra cập nhật
                        </Button>
                    </div>
                </Header>
                <Content className={styles.content}>
                    <div className={styles.container}>
                        <Filter refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
                        <div style={{ marginTop: 24 }}>
                            <Table refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
                        </div>
                        <div style={{ marginTop: 24 }}>
                            <UploadImage />
                        </div>
                    </div>
                </Content>
                <Footer className={styles.footer}>
                    Auto Tool ©2024 - v{__APP_VERSION__}
                </Footer>
            </Layout>
        </ConfigProvider>
    )
}

export default App
