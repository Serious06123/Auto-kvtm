import React, { useEffect } from 'react'
import JMuxer from 'jmuxer'
import * as styles from './LiveScreen.module.css'

const LiveScreen = (props) => {
    useEffect(() => {
        let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let socketURL = protocol + '//' + window.location.host + '/live/' + encodeURIComponent(props.deviceId)
        let jmuxer = new JMuxer({
            node: `player-${props.deviceId}`,
            mode: 'video',
            flushingTime: 0,
            clearBuffer: true,
            fps: 60,
            debug: false,
        })
        let ws = new WebSocket(socketURL)
        ws.binaryType = 'arraybuffer'
        ws.addEventListener('message', function (event) {
            jmuxer.feed({
                video: new Uint8Array(event.data),
            })
        })
        ws.addEventListener('error', function (e) {
            console.log('Socket Error')
        })

        props.webSocketHandler && props.webSocketHandler(ws)

        return () => {
            try {
                ws.close()
            } catch (_) {}
            try {
                jmuxer.destroy()
            } catch (_) {}
        }
    }, [])

    return <video className={styles.liveVideo} key={props.deviceId} id={`player-${props.deviceId}`} autoPlay muted playsInline />
}

export default React.memo(LiveScreen)
