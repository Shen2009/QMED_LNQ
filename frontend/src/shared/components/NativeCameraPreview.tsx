import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {CameraView} from 'expo-camera';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';

export interface NativeCameraHandle {
  recordAsync: (options?: {maxDuration?: number}) => Promise<any>;
  stopRecording: () => void;
  waitUntilReady: (timeoutMs?: number) => Promise<void>;
}

interface Props {
  style?: StyleProp<ViewStyle>;
  facing?: 'front' | 'back';
  mode?: 'picture' | 'video';
}

const NativeCameraPreview = forwardRef<NativeCameraHandle, Props>(function NativeCameraPreview(
  {style, facing = 'front', mode = 'video'},
  ref,
) {
  const cameraRef = useRef<any>(null);
  const readyRef = useRef(false);
  const readyResolveRef = useRef<(() => void) | null>(null);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const [mountError, setMountError] = useState('');

  const ensureReadyPromise = () => {
    if (!readyPromiseRef.current) {
      readyPromiseRef.current = new Promise<void>(resolve => {
        readyResolveRef.current = resolve;
      });
    }
    return readyPromiseRef.current;
  };

  useImperativeHandle(ref, () => ({
    recordAsync: (options) => cameraRef.current?.recordAsync(options),
    stopRecording: () => cameraRef.current?.stopRecording(),
    waitUntilReady: async (timeoutMs = 8000) => {
      if (readyRef.current) return;
      await Promise.race([
        ensureReadyPromise(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error(
          mountError || 'Camera chua san sang. Hay kiem tra quyen camera va thu lai.',
        )), timeoutMs)),
      ]);
    },
  }), [mountError]);

  return (
    <View style={[styles.root, style]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode}
        onCameraReady={() => {
          readyRef.current = true;
          readyResolveRef.current?.();
          readyResolveRef.current = null;
          setMountError('');
        }}
        onMountError={(event: any) => {
          const message = event?.message || 'Khong the khoi dong camera tren thiet bi nay.';
          setMountError(message);
        }}
      />
      {mountError ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{mountError}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden'},
  error: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#111'},
  errorText: {color: '#fff', textAlign: 'center'},
});

export default NativeCameraPreview;
