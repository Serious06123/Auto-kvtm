import React, { useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import { Buffer } from 'buffer'
import axios from 'axios'

import * as styles from './ImageScreen.module.css'
import { computeScreenPoint, CrosshairMarker, ScreenPointPanel } from '../ScreenPointOverlay'

const ImageScreen = (props) => {
    const { loading, setLoading, deviceId } = props
    const [data, setData] = useState(null)
    const [pickedPoint, setPickedPoint] = useState(null)
    const containerRef = useRef(null)
    const imgRef = useRef(null)

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setPickedPoint(null)
        axios
            .get(`/api/viewDevice?device=${encodeURIComponent(deviceId)}`, {
                responseType: 'arraybuffer',
            })
            .then((response) => {
                if (!isMounted) return
                const imgData = Buffer.from(response.data, 'binary').toString('base64')
                setData(imgData)
                setLoading(false)
            })
            .catch(() => {
                if (isMounted) setLoading(false)
            })
        return () => {
            isMounted = false
        }
    }, [deviceId])

    const handleContextMenu = (e) => {
        if (!data) return
        e.preventDefault()
        const pt = computeScreenPoint(imgRef.current || containerRef.current, e.clientX, e.clientY)
        if (pt) {
            setPickedPoint(pt)
        }
    }

    return (
        <>
            <Spin spinning={loading} size="small" />
            {!loading && data && (
                <div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                        Ấn chuột phải lên ảnh để xem tọa độ &amp; chạm thử
                    </div>
                    <div
                        ref={containerRef}
                        onContextMenu={handleContextMenu}
                        style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair' }}
                    >
                        <img
                            ref={imgRef}
                            className={styles.imageScreen}
                            src={`data:image/png;base64,${data}`}
                            alt={`Màn hình ${deviceId}`}
                            draggable={false}
                            style={{ display: 'block', userSelect: 'none' }}
                        />
                        <CrosshairMarker point={pickedPoint} />
                    </div>
                    <ScreenPointPanel point={pickedPoint} deviceId={deviceId} compact />
                </div>
            )}
        </>
    )
}

export default React.memo(ImageScreen)
