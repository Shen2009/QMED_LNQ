import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Platform, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';

export interface CameraRecorderHandle {
  recordAsync: (options?: {maxDuration?: number}) => Promise<{uri: string; name: string; type: string} | null>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

interface Props {style?: StyleProp<ViewStyle>}

const getMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || '';
};

const WebCameraRecorder = forwardRef(function WebCameraRecorder(
  {style}: Props,
  ref: ForwardedRef<CameraRecorderHandle>,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<any>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let active = true;
    const open = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorText('Trinh duyet khong ho tro camera.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: {ideal: 'user'}, width: {ideal: 1280}, height: {ideal: 720}},
          audio: false,
        });
        if (!active) return stream.getTracks().forEach(track => track.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setErrorText('');
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Khong the mo camera.');
      }
    };
    open();
    return () => {
      active = false;
      const state = recordingRef.current;
      if (state && state.recorder.state !== 'inactive') state.recorder.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    recordAsync: ({maxDuration = 30} = {}) => {
      const stream = streamRef.current;
      if (!stream) return Promise.reject(new Error(errorText || 'Camera chua san sang.'));
      const mimeType = getMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, {mimeType}) : new MediaRecorder(stream);
      return new Promise(resolve => {
        const state = {recorder, chunks: [] as Blob[], resolve, timer: null as any, cancelled: false};
        recordingRef.current = state;
        recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size) state.chunks.push(event.data); };
        recorder.onstop = () => {
          if (state.timer) clearTimeout(state.timer);
          recordingRef.current = null;
          if (state.cancelled || !state.chunks.length) return resolve(null);
          const type = recorder.mimeType || mimeType || 'video/webm';
          const blob = new Blob(state.chunks, {type});
          resolve({uri: URL.createObjectURL(blob), name: `qmed-camera-${Date.now()}.webm`, type});
        };
        recorder.onerror = () => { recordingRef.current = null; resolve(null); };
        recorder.start(250);
        state.timer = setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), maxDuration * 1000);
      });
    },
    stopRecording: () => {
      const state = recordingRef.current;
      if (state && state.recorder.state !== 'inactive') state.recorder.stop();
    },
    cancelRecording: () => {
      const state = recordingRef.current;
      if (!state) return;
      state.cancelled = true;
      if (state.recorder.state !== 'inactive') state.recorder.stop();
    },
  }), [errorText]);

  return (
    <View style={[styles.root, style]}>
      {Platform.OS === 'web' ? React.createElement('video', {
        ref: videoRef, autoPlay: true, muted: true, playsInline: true, style: styles.video,
      }) : null}
      {errorText ? <View style={styles.error}><Text style={styles.errorText}>{errorText}</Text></View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden'},
  video: {position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'},
  error: {...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#111'},
  errorText: {color: '#fff', textAlign: 'center'},
});

export default WebCameraRecorder;
