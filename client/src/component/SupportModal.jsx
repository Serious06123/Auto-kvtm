import React, { useEffect, useMemo, useState } from 'react'
import {
    Modal,
    Tabs,
    Input,
    Select,
    Collapse,
    Tag,
    Space,
    Form,
    Button,
    Switch,
    Checkbox,
    Alert,
    Empty,
    Spin,
    message,
} from 'antd'
import {
    QuestionCircleOutlined,
    BugOutlined,
    BulbOutlined,
    SendOutlined,
    CopyOutlined,
} from '@ant-design/icons'
import axios from 'axios'
import { copyTextToClipboard } from './ScreenPointOverlay'

const { TextArea } = Input

const BUG_CATEGORIES = [
    'Nhận diện ảnh / OpenCV',
    'Kẹt bán hàng / Treo đêm',
    'Kết nối ADB / Appium',
    'OCR / Kho',
    'Giao diện / Khác',
]

const SUGGESTION_CATEGORIES = [
    'Auto sự kiện mới',
    'Auto hằng ngày',
    'Cải tiến tính năng có sẵn',
    'Tối ưu hiệu năng',
    'Giao diện / Trải nghiệm',
]

const CHANNEL_LABELS = {
    discord: 'Discord Webhook',
    telegram: 'Telegram Bot',
    relay: 'Kênh tiếp nhận (Discord / Telegram)',
}

const SupportModal = ({ open, onClose }) => {
    const [faqList, setFaqList] = useState([])
    const [faqLoading, setFaqLoading] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('ALL')

    const [feedbackStatus, setFeedbackStatus] = useState({ configured: false, channels: [], cooldownSeconds: 30 })
    const [statusLoading, setStatusLoading] = useState(false)
    const [devicesList, setDevicesList] = useState([])
    const [submittingBug, setSubmittingBug] = useState(false)
    const [submittingSuggestion, setSubmittingSuggestion] = useState(false)

    const [bugForm] = Form.useForm()
    const [suggestionForm] = Form.useForm()
    const bugDeviceId = Form.useWatch('deviceId', bugForm)

    useEffect(() => {
        if (!open) return
        let mounted = true

        setFaqLoading(true)
        axios
            .get('/api/faq')
            .then(({ data }) => {
                if (mounted) setFaqList(Array.isArray(data) ? data : [])
            })
            .catch(() => {
                if (mounted) message.error('Không tải được danh sách FAQ')
            })
            .finally(() => {
                if (mounted) setFaqLoading(false)
            })

        setStatusLoading(true)
        axios
            .get('/api/feedback/status')
            .then(({ data }) => {
                if (mounted && data) setFeedbackStatus(data)
            })
            .catch(() => {
                // Keep default unconfigured state on failure
            })
            .finally(() => {
                if (mounted) setStatusLoading(false)
            })

        axios
            .get('/api/settings')
            .then(({ data }) => {
                if (mounted) setDevicesList(Array.isArray(data?.listDevices) ? data.listDevices : [])
            })
            .catch(() => {
                // Ignore device load error
            })

        return () => {
            mounted = false
        }
    }, [open])

    const categories = useMemo(() => {
        const set = new Set()
        faqList.forEach((item) => {
            if (item?.category) set.add(item.category)
        })
        return Array.from(set)
    }, [faqList])

    const filteredFaq = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        return faqList.filter((item) => {
            if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
            if (!q) return true
            const hay = [item.question, item.answer, item.category, ...(Array.isArray(item.tags) ? item.tags : [])]
                .join(' ')
                .toLowerCase()
            return hay.includes(q)
        })
    }, [faqList, searchText, selectedCategory])

    const handleCopyDraft = async (type, form) => {
        const values = form.getFieldsValue()
        const tag = type === 'bug' ? '[BÁO CÁO LỖI]' : '[ĐỀ XUẤT AUTO]'
        const lines = [
            `${tag} ${values.title || '(Chưa nhập tiêu đề)'}`,
            values.category ? `Danh mục: ${values.category}` : '',
            values.deviceId ? `Thiết bị: ${values.deviceId}` : '',
            values.contact ? `Liên hệ: ${values.contact}` : '',
            '',
            'Mô tả:',
            values.description || '',
            values.steps ? `\nCác bước tái hiện:\n${values.steps}` : '',
        ].filter((x, idx, arr) => x !== '' || (idx > 0 && arr[idx - 1] !== ''))

        await copyTextToClipboard(lines.join('\n'), 'Đã copy nội dung để gửi thủ công!')
    }

    const handleSubmitFeedback = async (type, values, form, setLoading) => {
        setLoading(true)
        try {
            const payload = {
                type,
                title: values.title,
                category: values.category,
                description: values.description,
                steps: values.steps || '',
                contact: values.contact || '',
                deviceId: type === 'bug' ? values.deviceId || '' : '',
                includeLogs: type === 'bug' ? Boolean(values.includeLogs) : false,
                includeScreenshot: type === 'bug' ? Boolean(values.includeScreenshot && values.deviceId) : false,
            }
            const { data } = await axios.post('/api/feedback', payload)
            const sentChannels = (data.results || [])
                .filter((r) => r.ok)
                .map((r) => CHANNEL_LABELS[r.channel] || r.channel)
                .join(', ')
            message.success(`Đã gửi thành công${sentChannels ? ` qua ${sentChannels}` : ''}!`)
            form.resetFields()
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message
            message.error('Gửi thất bại: ' + errMsg)
        } finally {
            setLoading(false)
        }
    }

    const renderChannelStatus = () => {
        if (statusLoading) return null
        if (feedbackStatus.configured) {
            const names = (feedbackStatus.channels || []).map((c) => CHANNEL_LABELS[c] || c)
            return (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#555' }}>Kênh nhận phản hồi trên server:</span>
                    {names.map((name) => (
                        <Tag key={name} color="green">
                            {name}
                        </Tag>
                    ))}
                </div>
            )
        }
        return (
            <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Chưa cấu hình kênh Discord / Telegram nhận phản hồi trên server"
                description="Tạo file data/feedback_config.json (copy từ data/feedback_config.example.json) hoặc đặt biến môi trường FEEDBACK_DISCORD_WEBHOOK / FEEDBACK_TELEGRAM_BOT_TOKEN + FEEDBACK_TELEGRAM_CHAT_ID. Bạn vẫn có thể bấm 'Copy nội dung' bên dưới để gửi thủ công."
            />
        )
    }

    const faqTab = (
        <div>
            <Space wrap style={{ width: '100%', marginBottom: 12 }}>
                <Input.Search
                    allowClear
                    placeholder="Tìm câu hỏi, lỗi ADB, treo đêm, OCR..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 320 }}
                />
                <Select
                    style={{ width: 220 }}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={[
                        { value: 'ALL', label: 'Tất cả danh mục' },
                        ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                />
            </Space>

            {faqLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                    <Spin />
                </div>
            ) : filteredFaq.length === 0 ? (
                <Empty description="Không tìm thấy câu hỏi phù hợp" />
            ) : (
                <div style={{ maxHeight: 430, overflowY: 'auto', paddingRight: 4 }}>
                    <Collapse
                        accordion
                        items={filteredFaq.map((item) => ({
                            key: item.id,
                            label: (
                                <Space size={8} wrap>
                                    <Tag color="blue">{item.category}</Tag>
                                    <strong>{item.question}</strong>
                                </Space>
                            ),
                            children: (
                                <div>
                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 13 }}>
                                        {item.answer}
                                    </div>
                                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            {item.tags.map((tag) => (
                                                <Tag key={tag} style={{ fontSize: 11 }}>
                                                    #{tag}
                                                </Tag>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ),
                        }))}
                    />
                </div>
            )}
        </div>
    )

    const bugTab = (
        <div>
            {renderChannelStatus()}
            <Form
                form={bugForm}
                layout="vertical"
                initialValues={{
                    category: BUG_CATEGORIES[0],
                    includeLogs: true,
                    includeScreenshot: false,
                }}
                onFinish={(values) => handleSubmitFeedback('bug', values, bugForm, setSubmittingBug)}
            >
                <Form.Item
                    name="title"
                    label="Tiêu đề lỗi"
                    rules={[
                        { required: true, message: 'Vui lòng nhập tiêu đề lỗi' },
                        { min: 3, max: 150, message: 'Tiêu đề cần dài từ 3 đến 150 ký tự' },
                    ]}
                >
                    <Input placeholder="VD: Treo bán hàng ban đêm bị đứng tại bảng quầy..." />
                </Form.Item>

                <Space style={{ display: 'flex' }} align="start" wrap>
                    <Form.Item name="category" label="Nhóm lỗi" style={{ minWidth: 230 }}>
                        <Select options={BUG_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                    </Form.Item>
                    <Form.Item name="deviceId" label="Thiết bị liên quan (tùy chọn)" style={{ minWidth: 230 }}>
                        <Select
                            allowClear
                            placeholder="Chọn thiết bị nếu cần chụp màn hình"
                            options={devicesList.map((d) => ({ value: d.value, label: d.label }))}
                        />
                    </Form.Item>
                    <Form.Item name="contact" label="Liên hệ Discord / Zalo / Tên" style={{ minWidth: 220 }}>
                        <Input placeholder="VD: discord @tenban" maxLength={100} />
                    </Form.Item>
                </Space>

                <Form.Item
                    name="description"
                    label="Mô tả chi tiết lỗi"
                    rules={[
                        { required: true, message: 'Vui lòng mô tả lỗi bạn gặp phải' },
                        { min: 5, max: 2500, message: 'Mô tả cần dài từ 5 đến 2500 ký tự' },
                    ]}
                >
                    <TextArea rows={4} placeholder="Mô tả hiện tượng, auto đang chạy, tần suất xảy ra..." />
                </Form.Item>

                <Form.Item name="steps" label="Các bước tái hiện (tùy chọn)">
                    <TextArea rows={2} placeholder="1. Mở auto ... 2. Chạy tới bước ... 3. Xảy ra lỗi..." maxLength={1000} />
                </Form.Item>

                <Space wrap size="large" style={{ marginBottom: 16 }}>
                    <Form.Item name="includeLogs" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Switch checkedChildren="Kèm log" unCheckedChildren="Không kèm log" />
                    </Form.Item>
                    <span style={{ fontSize: 12, color: '#555' }}>
                        Đính kèm 25 dòng log lỗi gần nhất (tự ẩn token/webhook)
                    </span>
                    <Form.Item name="includeScreenshot" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Checkbox disabled={!bugDeviceId}>Chụp kèm ảnh màn hình thiết bị</Checkbox>
                    </Form.Item>
                </Space>

                <Space>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SendOutlined />}
                        loading={submittingBug}
                        disabled={!feedbackStatus.configured}
                    >
                        Gửi báo cáo lỗi
                    </Button>
                    <Button icon={<CopyOutlined />} onClick={() => handleCopyDraft('bug', bugForm)}>
                        Copy nội dung
                    </Button>
                </Space>
            </Form>
        </div>
    )

    const suggestionTab = (
        <div>
            {renderChannelStatus()}
            <Form
                form={suggestionForm}
                layout="vertical"
                initialValues={{
                    category: SUGGESTION_CATEGORIES[0],
                }}
                onFinish={(values) =>
                    handleSubmitFeedback('suggestion', values, suggestionForm, setSubmittingSuggestion)
                }
            >
                <Form.Item
                    name="title"
                    label="Tiêu đề đề xuất"
                    rules={[
                        { required: true, message: 'Vui lòng nhập tiêu đề đề xuất' },
                        { min: 3, max: 150, message: 'Tiêu đề cần dài từ 3 đến 150 ký tự' },
                    ]}
                >
                    <Input placeholder="VD: Thêm auto nhận quà sự kiện mới hoặc tối ưu quy trình..." />
                </Form.Item>

                <Space style={{ display: 'flex' }} align="start" wrap>
                    <Form.Item name="category" label="Loại đề xuất" style={{ minWidth: 260 }}>
                        <Select options={SUGGESTION_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                    </Form.Item>
                    <Form.Item name="contact" label="Liên hệ (tùy chọn)" style={{ minWidth: 260 }}>
                        <Input placeholder="VD: discord @tenban" maxLength={100} />
                    </Form.Item>
                </Space>

                <Form.Item
                    name="description"
                    label="Mô tả chi tiết luồng thao tác / tính năng mong muốn"
                    rules={[
                        { required: true, message: 'Vui lòng mô tả đề xuất của bạn' },
                        { min: 5, max: 2500, message: 'Mô tả cần dài từ 5 đến 2500 ký tự' },
                    ]}
                >
                    <TextArea
                        rows={5}
                        placeholder="Mô tả từng bước game cần auto bấm, điều kiện dừng hoặc cải tiến mong muốn..."
                    />
                </Form.Item>

                <Space>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SendOutlined />}
                        loading={submittingSuggestion}
                        disabled={!feedbackStatus.configured}
                    >
                        Gửi đề xuất
                    </Button>
                    <Button icon={<CopyOutlined />} onClick={() => handleCopyDraft('suggestion', suggestionForm)}>
                        Copy nội dung
                    </Button>
                </Space>
            </Form>
        </div>
    )

    return (
        <Modal
            title="Trung tâm Hỗ trợ, FAQ & Gửi góp ý"
            open={open}
            onCancel={onClose}
            footer={null}
            width={760}
        >
            <Tabs
                defaultActiveKey="faq"
                items={[
                    {
                        key: 'faq',
                        label: (
                            <span>
                                <QuestionCircleOutlined /> FAQ (Hỏi đáp)
                            </span>
                        ),
                        children: faqTab,
                    },
                    {
                        key: 'bug',
                        label: (
                            <span>
                                <BugOutlined /> Báo cáo lỗi
                            </span>
                        ),
                        children: bugTab,
                    },
                    {
                        key: 'suggestion',
                        label: (
                            <span>
                                <BulbOutlined /> Đề xuất về Auto
                            </span>
                        ),
                        children: suggestionTab,
                    },
                ]}
            />
        </Modal>
    )
}

export default SupportModal
