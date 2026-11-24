import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, InputNumber, Select, Upload, message, Form, Modal, Table, Popconfirm, Space, Tag, Image, Row, Col, Card } from 'antd'
import { UploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FileImageOutlined, ScissorOutlined, CameraOutlined, AimOutlined } from '@ant-design/icons'
import axios from 'axios'
import { computeScreenPoint, CrosshairMarker, ScreenPointPanel } from './ScreenPointOverlay'

const ROI_OPTIONS = [
    { value: '', label: 'Toàn màn hình' },
    { value: '1', label: 'Góc phần tư 1 (trên-trái)' },
    { value: '2', label: 'Góc phần tư 2 (trên-phải)' },
    { value: '3', label: 'Góc phần tư 3 (dưới-trái)' },
    { value: '4', label: 'Góc phần tư 4 (dưới-phải)' },
    { value: '12', label: 'Nửa trên (12)' },
    { value: '34', label: 'Nửa dưới (34)' },
    { value: 'caytrong', label: 'Vùng cây trồng' },
    { value: 'thuhoach', label: 'Vùng giỏ thu hoạch' },
    { value: 'quayhang', label: 'Vùng quầy hàng' },
    { value: 'bando', label: 'Vùng bán đồ' },
    { value: 'batbo', label: 'Vùng bắt bọ' },
    { value: 'giaohangcu', label: 'Vùng giao hàng cú' },
    { value: 'kimcuongcu', label: 'Vùng nút giao cú' },
]

const { Option } = Select

const UploadImage = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [imagesList, setImagesList] = useState([])
    const [tableLoading, setTableLoading] = useState(false)

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState(null)
    const [editKeyName, setEditKeyName] = useState('')
    const [editValue, setEditValue] = useState('')
    const [editFileList, setEditFileList] = useState([])
    const [editLoading, setEditLoading] = useState(false)

    // Crop & Test Match Modal State
    const [cropModalOpen, setCropModalOpen] = useState(false)
    const [devicesList, setDevicesList] = useState([])
    const [cropDeviceId, setCropDeviceId] = useState('')
    const [screenUrl, setScreenUrl] = useState('')
    const [capturing, setCapturing] = useState(false)
    const [cropRect, setCropRect] = useState(null)
    const [dragStart, setDragStart] = useState(null)
    const [cropKeyType, setCropKeyType] = useState('ItemKeys')
    const [cropKeyName, setCropKeyName] = useState('')
    const [cropValue, setCropValue] = useState('')
    const [cropSaving, setCropSaving] = useState(false)
    const [testTemplateValue, setTestTemplateValue] = useState('')
    const [testPosition, setTestPosition] = useState('')
    const [testRate, setTestRate] = useState(0.85)
    const [testLoading, setTestLoading] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [pickedPoint, setPickedPoint] = useState(null)
    const imgContainerRef = useRef(null)
    const imgRef = useRef(null)

    const fetchImages = async () => {
        setTableLoading(true)
        try {
            const { data } = await axios.get('/api/images')
            setImagesList(data)
        } catch (error) {
            console.error('Failed to fetch images:', error)
            message.error('Failed to load image list')
        } finally {
            setTableLoading(false)
        }
    }

    useEffect(() => {
        fetchImages()
    }, [])

    const showModal = () => {
        setIsModalOpen(true)
    }

    const handleCancel = () => {
        setIsModalOpen(false)
    }

    const onFinish = async (values) => {
        setLoading(true)
        const formData = new FormData()
        formData.append('keyType', values.keyType)
        formData.append('keyName', values.keyName)
        formData.append('value', values.value)
        if (values.file && values.file.length > 0) {
            formData.append('file', values.file[0].originFileObj)
        }

        try {
            await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            message.success('Upload successful and const.js updated!')
            form.resetFields()
            setIsModalOpen(false)
            fetchImages()
        } catch (error) {
            console.error(error)
            message.error('Upload failed: ' + (error.response?.data?.error || error.message))
        } finally {
            setLoading(false)
        }
    }

    const normFile = (e) => {
        if (Array.isArray(e)) {
            return e
        }
        return e && e.fileList
    }

    const handleDelete = async (record) => {
        try {
            await axios.delete('/api/images', { data: record })
            message.success(`Deleted ${record.keyName} successfully`)
            fetchImages()
        } catch (error) {
            message.error('Delete failed: ' + (error.response?.data?.error || error.message))
        }
    }

    const startEdit = (record) => {
        setEditingRecord(record)
        setEditKeyName(record.keyName)
        setEditValue(record.value)
        setEditFileList([])
    }

    const handleEditSubmit = async () => {
        if (!editKeyName || !editValue) {
            return message.error('Key Name and Value cannot be empty')
        }
        setEditLoading(true)
        try {
            const formData = new FormData()
            formData.append('keyType', editingRecord.keyType)
            formData.append('oldKeyName', editingRecord.keyName)
            formData.append('newKeyName', editKeyName)
            formData.append('oldValue', editingRecord.value)
            formData.append('newValue', editValue)
            if (editFileList && editFileList.length > 0) {
                formData.append('file', editFileList[0].originFileObj)
            }

            await axios.put('/api/images', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            message.success('Updated key successfully')
            setEditingRecord(null)
            fetchImages()
        } catch (error) {
            message.error('Update failed: ' + (error.response?.data?.error || error.message))
        } finally {
            setEditLoading(false)
        }
    }

    const openCropModal = async () => {
        setCropModalOpen(true)
        try {
            const { data } = await axios.get('/api/settings')
            const list = data?.listDevices || []
            setDevicesList(list)
            if (!cropDeviceId && list.length > 0) {
                setCropDeviceId(list[0].value)
            }
        } catch (err) {
            message.error('Không lấy được danh sách thiết bị: ' + err.message)
        }
    }

    const handleCaptureScreen = async () => {
        if (!cropDeviceId) return message.warning('Vui lòng chọn thiết bị')
        setCapturing(true)
        setTestResult(null)
        try {
            const res = await axios.get(`/api/viewDevice?device=${encodeURIComponent(cropDeviceId)}&t=${Date.now()}`, {
                responseType: 'blob',
            })
            if (screenUrl) URL.revokeObjectURL(screenUrl)
            setScreenUrl(URL.createObjectURL(res.data))
            setCropRect(null)
            setPickedPoint(null)
        } catch (err) {
            message.error('Chụp màn hình thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setCapturing(false)
        }
    }

    const getRelPercent = (clientX, clientY) => {
        const el = imgRef.current || imgContainerRef.current
        if (!el) return { x: 0, y: 0 }
        const rect = el.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
        return { x, y }
    }

    const handleMouseDown = (e) => {
        if (!screenUrl || e.button !== 0) return
        e.preventDefault()
        const pt = getRelPercent(e.clientX, e.clientY)
        setDragStart(pt)
        setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 })
    }

    const handleContextMenu = (e) => {
        if (!screenUrl) return
        e.preventDefault()
        const pt = computeScreenPoint(imgRef.current || imgContainerRef.current, e.clientX, e.clientY)
        if (pt) {
            setPickedPoint(pt)
        }
    }

    const handleMouseMove = (e) => {
        if (!dragStart) return
        const pt = getRelPercent(e.clientX, e.clientY)
        setCropRect({
            x: Math.min(dragStart.x, pt.x),
            y: Math.min(dragStart.y, pt.y),
            w: Math.abs(pt.x - dragStart.x),
            h: Math.abs(pt.y - dragStart.y),
        })
    }

    const handleMouseUp = () => {
        if (dragStart) setDragStart(null)
    }

    const handleCropSave = async () => {
        if (!cropDeviceId || !screenUrl) return message.warning('Vui lòng chụp màn hình thiết bị trước')
        if (!cropRect || cropRect.w < 0.5 || cropRect.h < 0.5) return message.warning('Vui lòng kéo chuột chọn vùng ảnh cần cắt')
        if (!cropKeyName || !cropValue) return message.warning('Vui lòng nhập Key Name và Value')
        setCropSaving(true)
        try {
            const { data } = await axios.post('/api/images/cropSave', {
                deviceId: cropDeviceId,
                keyType: cropKeyType,
                keyName: cropKeyName,
                value: cropValue,
                crop: cropRect,
                useLastCapture: true,
            })
            message.success(`Đã cắt và lưu ${data.filename} (${data.size.w}x${data.size.h}px)`)
            setCropKeyName('')
            setCropValue('')
            fetchImages()
        } catch (err) {
            message.error('Lưu ảnh cắt thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setCropSaving(false)
        }
    }

    const handleTestMatch = async () => {
        if (!cropDeviceId || !screenUrl) return message.warning('Vui lòng chụp màn hình thiết bị trước')
        if (!testTemplateValue) return message.warning('Vui lòng chọn ảnh mẫu cần test')
        setTestLoading(true)
        try {
            const { data } = await axios.post('/api/images/testMatch', {
                deviceId: cropDeviceId,
                value: testTemplateValue,
                findPosition: testPosition || null,
                rate: testRate,
                useLastCapture: true,
            })
            setTestResult(data)
            if (data.matches?.length > 0) {
                message.success(`Tìm thấy ${data.matches.length} vị trí khớp (Max score: ${data.bestScore})`)
            } else {
                message.info(`Không đạt ngưỡng ${data.threshold} (Best score: ${data.bestScore})`)
            }
        } catch (err) {
            message.error('Test nhận diện thất bại: ' + (err.response?.data?.error || err.message))
        } finally {
            setTestLoading(false)
        }
    }

    const columns = [
        {
            title: 'Key Type',
            dataIndex: 'keyType',
            key: 'keyType',
            filters: [
                { text: 'ItemKeys', value: 'ItemKeys' },
                { text: 'TreeKeys', value: 'TreeKeys' },
                { text: 'BugKeys', value: 'BugKeys' },
                { text: 'ProductKeys', value: 'ProductKeys' },
                { text: 'ProductTreeKeys', value: 'ProductTreeKeys' },
                { text: 'ProductMineralKeys', value: 'ProductMineralKeys' },
                { text: 'OtherKeys', value: 'OtherKeys' },
                { text: 'EventKeys', value: 'EventKeys' },
            ],
            onFilter: (value, record) => record.keyType === value,
            render: (text) => {
                const colors = {
                    ItemKeys: 'blue',
                    TreeKeys: 'green',
                    BugKeys: 'orange',
                    ProductKeys: 'purple',
                    ProductTreeKeys: 'cyan',
                    ProductMineralKeys: 'gold',
                    OtherKeys: 'magenta',
                    EventKeys: 'red',
                }
                return <Tag color={colors[text] || 'default'}>{text}</Tag>
            }
        },
        {
            title: 'Key Name (Code)',
            dataIndex: 'keyName',
            key: 'keyName',
            sorter: (a, b) => a.keyName.localeCompare(b.keyName),
            render: (text) => <strong style={{ fontFamily: 'monospace' }}>{text}</strong>
        },
        {
            title: 'Value (Filename)',
            dataIndex: 'value',
            key: 'value',
            render: (text) => <span style={{ fontFamily: 'monospace', color: '#666' }}>{text}</span>
        },
        {
            title: 'Image Preview',
            key: 'preview',
            align: 'center',
            render: (_, record) => {
                if (record.hasImage) {
                    return (
                        <Image
                            width={40}
                            height={40}
                            style={{ objectFit: 'contain', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4 }}
                            src={`/api/viewImage?name=${record.value}&t=${Date.now()}`}
                            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-5-5L5 21'/></svg>"
                        />
                    )
                }
                return <Tag color="error">No Image</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        type="text" 
                        icon={<EditOutlined style={{ color: '#1890ff' }} />} 
                        onClick={() => startEdit(record)}
                        title="Edit constant properties"
                    />
                    <Popconfirm
                        title="Are you sure you want to delete this template constant and its image?"
                        onConfirm={() => handleDelete(record)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            title="Delete constant and image"
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileImageOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Game Templates / Images Manager</h3>
                </div>
                <Space>
                    <Button icon={<ScissorOutlined />} onClick={openCropModal}>
                        Chụp & Cắt / Test khớp
                    </Button>
                    <Button type="primary" onClick={showModal} icon={<PlusOutlined />}>
                        Add New Image
                    </Button>
                </Space>
            </div>

            <Table 
                columns={columns} 
                dataSource={imagesList} 
                rowKey={(record) => `${record.keyType}-${record.keyName}`} 
                loading={tableLoading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                size="small"
                bordered
            />

            {/* Add Image Modal */}
            <Modal
                title="Upload Image & Add Key"
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="keyType"
                        label="Key Type"
                        rules={[{ required: true, message: 'Please select a key type!' }]}
                    >
                        <Select placeholder="Select a key type">
                            <Option value="ItemKeys">ItemKeys</Option>
                            <Option value="TreeKeys">TreeKeys</Option>
                            <Option value="BugKeys">BugKeys</Option>
                            <Option value="ProductKeys">ProductKeys</Option>
                            <Option value="ProductTreeKeys">ProductTreeKeys</Option>
                            <Option value="ProductMineralKeys">ProductMineralKeys</Option>
                            <Option value="OtherKeys">OtherKeys</Option>
                            <Option value="EventKeys">EventKeys</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="keyName"
                        label="Tên (Tên viết liền không có khoảng trắng hay dấu cách '-')"
                        rules={[{ required: true, message: 'Please enter the key name!' }]}
                    >
                        <Input 
                            placeholder="e.g. myNewItem" 
                            onChange={(e) => {
                                const val = e.target.value
                                // Automatic filename generation: slugify the input keyName
                                const filenameVal = val.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                                form.setFieldsValue({ value: filenameVal })
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="value"
                        label="Value (String Value / Filename)"
                        rules={[{ required: true, message: 'Please enter the value!' }]}
                    >
                        <Input placeholder="e.g. my-new-item" />
                    </Form.Item>

                    <Form.Item
                        name="file"
                        label="Image File"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                        rules={[{ required: true, message: 'Please upload an image!' }]}
                    >
                        <Upload name="logo" listType="picture" beforeUpload={() => false} maxCount={1}>
                            <Button icon={<UploadOutlined />}>Click to upload</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Upload & Update
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Key / Value Modal */}
            <Modal
                title="Edit Template Constant / Value"
                open={!!editingRecord}
                onOk={handleEditSubmit}
                onCancel={() => setEditingRecord(null)}
                confirmLoading={editLoading}
                okText="Save"
            >
                <Form layout="vertical" style={{ marginTop: '16px' }}>
                    <Form.Item label="Key Name (Code)">
                        <Input value={editKeyName} onChange={e => setEditKeyName(e.target.value)} placeholder="e.g. myNewItem" />
                    </Form.Item>
                    <Form.Item label="Value (Filename - without .png)">
                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="e.g. my-new-item" />
                    </Form.Item>
                    <Form.Item label="Replace Image (Optional)">
                        <Upload
                            listType="picture"
                            beforeUpload={() => false}
                            maxCount={1}
                            fileList={editFileList}
                            onChange={({ fileList }) => setEditFileList(fileList)}
                        >
                            <Button icon={<UploadOutlined />}>Click to select new image</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Interactive Crop & OpenCV Match Test Modal */}
            <Modal
                title="Chụp màn hình, Cắt ảnh mẫu & Test khớp OpenCV"
                open={cropModalOpen}
                onCancel={() => setCropModalOpen(false)}
                footer={null}
                width={980}
            >
                <Space wrap style={{ marginBottom: 12 }}>
                    <Select
                        style={{ width: 240 }}
                        placeholder="Chọn thiết bị..."
                        value={cropDeviceId || undefined}
                        onChange={setCropDeviceId}
                        options={devicesList.map((d) => ({ value: d.value, label: d.label }))}
                    />
                    <Button type="primary" icon={<CameraOutlined />} loading={capturing} onClick={handleCaptureScreen}>
                        Chụp màn hình
                    </Button>
                    {cropRect && cropRect.w > 0 && (
                        <Tag color="green">
                            Vùng chọn: x={cropRect.x.toFixed(1)}%, y={cropRect.y.toFixed(1)}%, w={cropRect.w.toFixed(1)}%, h={cropRect.h.toFixed(1)}%
                        </Tag>
                    )}
                </Space>

                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                            Kéo chuột trái để cắt vùng ảnh mẫu · Ấn chuột phải vào điểm bất kỳ để lấy tọa độ &amp; chạm thử
                        </div>
                        <div
                            ref={imgContainerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onContextMenu={handleContextMenu}
                            style={{
                                position: 'relative',
                                userSelect: 'none',
                                cursor: screenUrl ? 'crosshair' : 'default',
                                border: '1px solid #d9d9d9',
                                borderRadius: 6,
                                minHeight: screenUrl ? undefined : 280,
                                background: '#fafafa',
                                display: screenUrl ? 'block' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            {screenUrl ? (
                                <>
                                    <img
                                        ref={imgRef}
                                        src={screenUrl}
                                        alt="Device Screenshot"
                                        draggable={false}
                                        style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                                    />
                                    <CrosshairMarker point={pickedPoint} />
                                    {cropRect && cropRect.w > 0 && cropRect.h > 0 && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: `${cropRect.x}%`,
                                                top: `${cropRect.y}%`,
                                                width: `${cropRect.w}%`,
                                                height: `${cropRect.h}%`,
                                                border: '2px dashed #52c41a',
                                                backgroundColor: 'rgba(82, 196, 26, 0.15)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    )}
                                    {(testResult?.matches || []).map((m, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'absolute',
                                                left: `${m.x}%`,
                                                top: `${m.y}%`,
                                                width: `${m.w}%`,
                                                height: `${m.h}%`,
                                                border: '2px solid #1890ff',
                                                backgroundColor: 'rgba(24, 144, 255, 0.15)',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    top: -18,
                                                    left: 0,
                                                    background: '#1890ff',
                                                    color: '#fff',
                                                    fontSize: 10,
                                                    padding: '0 4px',
                                                    borderRadius: 2,
                                                }}
                                            >
                                                {m.score}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <span style={{ color: '#999' }}>Chọn thiết bị và bấm "Chụp màn hình" để bắt đầu kéo cắt</span>
                            )}
                        </div>
                    </Col>

                    <Col xs={24} md={10}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <ScreenPointPanel point={pickedPoint} deviceId={cropDeviceId} />
                            <Card size="small" title="1. Lưu ảnh mẫu từ vùng cắt">
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    <Select value={cropKeyType} onChange={setCropKeyType} style={{ width: '100%' }}>
                                        <Option value="ItemKeys">ItemKeys</Option>
                                        <Option value="TreeKeys">TreeKeys</Option>
                                        <Option value="BugKeys">BugKeys</Option>
                                        <Option value="ProductKeys">ProductKeys</Option>
                                        <Option value="ProductTreeKeys">ProductTreeKeys</Option>
                                        <Option value="ProductMineralKeys">ProductMineralKeys</Option>
                                        <Option value="OtherKeys">OtherKeys</Option>
                                        <Option value="EventKeys">EventKeys</Option>
                                    </Select>
                                    <Input
                                        placeholder="Key Name (VD: myNewItem)"
                                        value={cropKeyName}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setCropKeyName(v)
                                            setCropValue(v.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                                        }}
                                    />
                                    <Input
                                        placeholder="Value / tên file (không cần .png)"
                                        value={cropValue}
                                        onChange={(e) => setCropValue(e.target.value)}
                                    />
                                    <Button type="primary" block icon={<ScissorOutlined />} loading={cropSaving} onClick={handleCropSave}>
                                        Cắt & Lưu thành ảnh mẫu
                                    </Button>
                                </Space>
                            </Card>

                            <Card size="small" title="2. Test khớp OpenCV trên ảnh chụp">
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    <Select
                                        showSearch
                                        style={{ width: '100%' }}
                                        placeholder="Chọn ảnh mẫu để test..."
                                        value={testTemplateValue || undefined}
                                        onChange={setTestTemplateValue}
                                        optionFilterProp="label"
                                        options={imagesList
                                            .filter((img) => img.hasImage)
                                            .map((img) => ({
                                                value: img.value,
                                                label: `${img.keyType}: ${img.keyName} (${img.value})`,
                                            }))}
                                    />
                                    <Select
                                        style={{ width: '100%' }}
                                        value={testPosition}
                                        onChange={setTestPosition}
                                        options={ROI_OPTIONS}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>Ngưỡng:</span>
                                        <InputNumber min={0.3} max={0.99} step={0.05} value={testRate} onChange={(v) => setTestRate(v ?? 0.85)} />
                                    </div>
                                    <Button block icon={<AimOutlined />} loading={testLoading} onClick={handleTestMatch}>
                                        Test nhận diện
                                    </Button>
                                    {testResult && (
                                        <div style={{ fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                                            <div>Best Score: <strong>{testResult.bestScore}</strong> / Ngưỡng: {testResult.threshold}</div>
                                            <div>Số vị trí khớp: <strong>{testResult.matches?.length || 0}</strong></div>
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Modal>
        </div>
    )
}

export default UploadImage
