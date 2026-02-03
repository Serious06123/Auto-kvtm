const moment = require('moment')
import React, { useState } from 'react'
import { Layout, ConfigProvider, theme, notification } from 'antd'
const { Header, Content, Footer } = Layout
import axios from 'axios'
import * as styles from './App.module.css'

import Filter from './component/Filter/Filter'
import Table from './component/Content/Table'
import UploadImage from './component/UploadImage'

const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/Serious06123/Auto-kvtm/main/package.json'

const App = (props) => {
    const [refreshTime, setRefreshTime] = useState(moment().format('LTS'))

    React.useEffect(() => {
        const checkUpdate = async () => {
            try {
                // Thêm timestamp để tránh cache
                const response = await axios.get(`${UPDATE_CHECK_URL}?t=${new Date().getTime()}`)
                const remoteVersion = response.data.version

                if (remoteVersion && remoteVersion !== __APP_VERSION__) {
                    notification.info({
                        message: 'Có bản cập nhật mới',
                        description: `Phiên bản mới (${remoteVersion}) đã sẵn sàng. Phiên bản hiện tại: ${__APP_VERSION__}.`,
                        placement: 'bottomRight',
                        duration: 10,
                    })
                }
            } catch (error) {
                console.error('Không thể kiểm tra cập nhật:', error)
            }
        }

        checkUpdate()
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
                        <h1 className={styles.title}>Auto Tools</h1>
                        <span className={styles.subtitle}>Manager</span>
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
