const moment = require('moment')
import React, { useState } from 'react'
import { Layout } from 'antd'
const { Header, Content, Footer } = Layout
import * as styles from './App.module.css'

import Filter from './component/Filter/Filter'
import Table from './component/Content/Table'

const App = (props) => {
    const [refreshTime, setRefreshTime] = useState(moment().format('LTS'))

    return (
        <Layout className={styles.layout}>
            <Header className={styles.header}>
                <h1>Developed by Serious based on Open Source (CongAnhHCMUS)</h1>
            </Header>
            <Content className={styles.content}>
                <Filter refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
                <Table refreshTime={refreshTime} setRefreshTime={setRefreshTime} />
            </Content>
            <Footer className={styles.footer}>
                <div></div>
            </Footer>
        </Layout>
    )
}

export default App
