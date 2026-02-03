import React, { useState } from 'react'
import { Button, Input, Select, Upload, message, Form, Modal } from 'antd'
import { UploadOutlined, PlusOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select

const UploadImage = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

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

    return (
        <div style={{ margin: '20px' }}>
            <Button type="primary" onClick={showModal} icon={<PlusOutlined />}>
                Add New Image
            </Button>
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
                            <Option value="ProductKeys">ProductKeys</Option>
                            <Option value="ProductTreeKeys">ProductTreeKeys</Option>
                            <Option value="ProductMineralKeys">ProductMineralKeys</Option>
                            <Option value="OtherKeys">OtherKeys</Option>
                            <Option value="EventKeys">EventKeys</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="keyName"
                        label="Key Name (Variable Name)"
                        rules={[{ required: true, message: 'Please enter the key name!' }]}
                    >
                        <Input placeholder="e.g. myNewItem" />
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
        </div>
    )
}

export default UploadImage
