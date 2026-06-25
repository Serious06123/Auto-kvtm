const moment = require('moment')
import React, { useState, useEffect } from 'react'
import { Layout, ConfigProvider, notification, Button, Modal, Timeline, Space } from 'antd'
const { Header, Content, Footer } = Layout
import { SyncOutlined, HistoryOutlined } from '@ant-design/icons'
import axios from 'axios'
import * as styles from './App.module.css'

import Filter from './component/Filter/Filter'
import Table from './component/Content/Table'
import UploadImage from './component/UploadImage'

const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/Serious06123/Auto-kvtm/main/package.json'
const REMOTE_CHANGELOG_URL = 'https://raw.githubusercontent.com/Serious06123/Auto-kvtm/main/data/changelog.json'

const App = (props) => {
    const [refreshTime, setRefreshTime] = useState(moment().format('LTS'))
    const [updating, setUpdating] = useState(false)
    const [changelogVisible, setChangelogVisible] = useState(false)
    const [changelogData, setChangelogData] = useState([])

    const showChangelog = async () => {
        setChangelogVisible(true)
        try {
            const { data } = await axios.get('/api/changelog')
            setChangelogData(data)
        } catch (error) {
            console.error('Không thể tải nhật ký cập nhật:', error)
        }
    }

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

    const isNewerVersion = (remote, current) => {
        if (!remote || !current) return false
        const r = remote.split('.').map(Number)
        const c = current.split('.').map(Number)
        for (let i = 0; i < 3; i++) {
            if ((r[i] || 0) > (c[i] || 0)) return true
            if ((r[i] || 0) < (c[i] || 0)) return false
        }
        return false
    }

    const handleCheckUpdate = async (manual = false) => {
        try {
            // Thêm timestamp để tránh cache và đọc trực tiếp file changelog từ GitHub
            const response = await axios.get(`${REMOTE_CHANGELOG_URL}?t=${new Date().getTime()}`)
            const remoteChangelog = response.data
            if (!Array.isArray(remoteChangelog) || remoteChangelog.length === 0) return

            const remoteVersion = remoteChangelog[0].version

            // Nếu chạy tự động và phiên bản này đã bị bỏ qua, không hiện thông báo
            if (!manual && localStorage.getItem('ignoredUpdateVersion') === remoteVersion) {
                return
            }
 
            if (remoteVersion && isNewerVersion(remoteVersion, __APP_VERSION__)) {
                // Lọc ra các phiên bản mới hơn phiên bản hiện tại để hiển thị thông tin cập nhật
                const newChanges = []
                for (const item of remoteChangelog) {
                    if (isNewerVersion(item.version, __APP_VERSION__)) {
                        newChanges.push({
                            version: item.version,
                            changes: item.changes
                        })
                    } else {
                        break
                    }
                }

                const key = `open${Date.now()}`
                const btn = (
                    <Space size="small">
                        <Button type="primary" size="small" onClick={() => {
                            notification.destroy(key)
                            performUpdate()
                        }} disabled={updating}>
                            Cập nhật ngay
                        </Button>
                        <Button size="small" onClick={() => {
                            localStorage.setItem('ignoredUpdateVersion', remoteVersion)
                            notification.destroy(key)
                        }}>
                            Bỏ qua
                        </Button>
                    </Space>
                )

                const descriptionContent = (
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            Phiên bản mới (v{remoteVersion}) đã sẵn sàng. Phiên bản bạn đang cài: v{__APP_VERSION__}.
                        </div>
                        {newChanges.length > 0 && (
                            <>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>Thông tin cập nhật:</div>
                                <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                    {newChanges.map(item => (
                                        <div key={item.version} style={{ marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1890ff' }}>v{item.version}:</div>
                                            <ul style={{ paddingLeft: '16px', listStyleType: 'disc', margin: '4px 0 0 0' }}>
                                                {item.changes.map((change, idx) => (
                                                    <li key={idx} style={{ fontSize: '12px', color: '#555' }}>{change}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )

                notification.info({
                    message: 'CÓ BẢN CẬP NHẬT MỚI',
                    description: descriptionContent,
                    placement: 'bottomRight',
                    btn,
                    key,
                    duration: 0,
                    style: { width: '400px' }
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button 
                                type="dashed" 
                                size="small" 
                                icon={<HistoryOutlined />} 
                                onClick={showChangelog}
                            >
                                Nhật ký cập nhật
                            </Button>
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

            <Modal
                title="Nhật ký cập nhật"
                open={changelogVisible}
                onCancel={() => setChangelogVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setChangelogVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={650}
            >
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px 0' }}>
                    {changelogData.length > 0 ? (
                        <Timeline
                            items={changelogData.map((item, index) => ({
                                color: index === 0 ? 'green' : 'gray',
                                children: (
                                    <div key={item.version}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                            <strong style={{ fontSize: '16px' }}>v{item.version}</strong>
                                            <span style={{ color: '#999', fontSize: '12px' }}>{item.date}</span>
                                        </div>
                                        <ul style={{ marginTop: '6px', paddingLeft: '20px', listStyleType: 'disc' }}>
                                            {item.changes.map((change, idx) => (
                                                <li key={idx} style={{ marginBottom: '4px', fontSize: '13px' }}>
                                                    {change}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            }))}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>Đang tải thông tin...</div>
                    )}
                </div>
            </Modal>
        </ConfigProvider>
    )
}

export default App
