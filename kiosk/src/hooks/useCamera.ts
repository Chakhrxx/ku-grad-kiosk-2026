import { useEffect, useEffectEvent, useRef, useState } from 'react'

/**
 * Open the camera into the returned video ref while `enabled`; it closes again when disabled or unmounted.
 * `stream` is also returned, for feeding the camera to the try-on stream.
 */
export function useCamera(enabled: boolean, onError: () => void, video: MediaTrackConstraints) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const handleError = useEffectEvent(onError)
  const constraints = JSON.stringify(video)

  useEffect(() => {
    if (!enabled) return
    let opened: MediaStream | undefined
    let closed = false

    navigator.mediaDevices
      .getUserMedia({ video: JSON.parse(constraints), audio: false })
      .then((s) => {
        opened = s
        if (closed) return s.getTracks().forEach((track) => track.stop())
        if (videoRef.current) videoRef.current.srcObject = s
        setStream(s)
      })
      .catch(() => handleError())

    return () => {
      closed = true
      opened?.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [enabled, constraints])

  return { videoRef, stream }
}
