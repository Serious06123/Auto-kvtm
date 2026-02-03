const moment = require('moment')
import React, { useState } from 'react'
import { Layout } from 'antd'
const { Header, Content, Footer } = Layout
import { notification } from 'antd'
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

                // __APP_VERSION__ được define trong webpack.config.js
                // console.log('Local version:', __APP_VERSION__)
                // console.log('Remote version:', remoteVersion)

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
        <Layout className={styles.layout}>
            <Header className={styles.header}>
                <h1>Developed by Serious based on Open Source (CongAnhHCMUS)</h1>
            </Header>
            <Content className={styles.content}>
                <Filter refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
                <UploadImage />
                <Table refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
            </Content>
            <Footer className={styles.footer}>
                <div></div>
            </Footer>
        </Layout>
    )
}

export default App
