import { useEffect, useEffectEvent, useRef } from 'react'

/** Ask for continuous autofocus where the camera has it, so a visitor who steps in or out stays sharp; ignored if not. */
function keepInFocus(stream: MediaStream) {
  const track = stream.getVideoTracks()[0]
  const modes = (track?.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode
  if (modes?.includes('continuous'))
    // focusMode is not in TypeScript's DOM types yet
    track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
}

/** Open the camera into the returned video ref while `enabled`; it closes again when disabled or unmounted. */
export function useCamera(enabled: boolean, onError: () => void, video: MediaTrackConstraints) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
        keepInFocus(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => handleError())

    return () => {
      closed = true
      opened?.getTracks().forEach((track) => track.stop())
    }
  }, [enabled, constraints])

  return { videoRef }
}
