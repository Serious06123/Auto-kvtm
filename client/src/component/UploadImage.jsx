import React, { useState, useEffect } from 'react'
import { Button, Input, Select, Upload, message, Form, Modal, Table, Popconfirm, Space, Tag, Image } from 'antd'
import { UploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FileImageOutlined } from '@ant-design/icons'
import axios from 'axios'

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
                <Button type="primary" onClick={showModal} icon={<PlusOutlined />}>
                    Add New Image
                </Button>
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
        </div>
    )
}

export default UploadImage
