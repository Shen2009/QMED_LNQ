import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {
  measurementService,
  MeasurementResultPayload,
} from '../../../core/api/measurementService';
import {useTheme} from '../../../core/theme/ThemeContext';

type MeasurePhase = 'idle' | 'measuring' | 'analyzing';

const MEASURE_SECONDS = 15;

const FaceRppgScreen = ({navigation}: any) => {
  const {theme} = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<MeasurePhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(MEASURE_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useMemo(
    () => 1 - secondsLeft / MEASURE_SECONDS,
    [secondsLeft],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fallbackResult = (): MeasurementResultPayload => ({
    type: 'Face rPPG',
    status: 'Bình thường',
    measuredAt: new Date().toISOString(),
    duration: MEASURE_SECONDS,
    primaryLabel: 'Heart Rate',
    primaryValue: 76,
    primaryUnit: 'BPM',
    note: 'Kết quả demo từ luồng camera Face rPPG frontend.',
    metrics: [
      {label: 'Heart Rate', value: 76, unit: 'BPM', icon: 'favorite'},
      {label: 'HRV', value: 48, unit: 'ms', icon: 'monitor-heart'},
      {label: 'Signal Quality', value: 92, unit: '%', icon: 'verified'},
    ],
  });

  const finishMeasurement = () => {
    stopTimer();
    setPhase('analyzing');

    setTimeout(async () => {
      const startedAt = new Date(Date.now() - MEASURE_SECONDS * 1000).toISOString();
      let result = fallbackResult();

      try {
        result = await measurementService.analyze({
          type: 'face_rppg',
          duration: MEASURE_SECONDS,
          startedAt,
          sessionId: `face-${Date.now()}`,
        });
      } catch {
        result = fallbackResult();
      }

      navigation.replace('MeasurementResult', {
        result,
      });
    }, 1200);
  };

  const startMeasurement = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) return;
    }

    setSecondsLeft(MEASURE_SECONDS);
    setPhase('measuring');
    stopTimer();

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          finishMeasurement();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelMeasurement = () => {
    stopTimer();
    setPhase('idle');
    setSecondsLeft(MEASURE_SECONDS);
  };

  const renderCameraContent = () => {
    if (!permission) {
      return (
        <View style={styles.cameraFallback}>
          <MaterialIcons name="photo-camera" size={38} color={theme.colors.textMuted} />
          <Text style={[styles.cameraText, {color: theme.colors.textSecondary}]}>
            Đang kiểm tra quyền camera...
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.cameraFallback}>
          <MaterialIcons name="no-photography" size={38} color={theme.colors.textMuted} />
          <Text style={[styles.cameraText, {color: theme.colors.textSecondary}]}>
            Cấp quyền camera để mở giao diện đo Face rPPG.
          </Text>
          <Button
            title="Cấp quyền camera"
            icon="photo-camera"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      );
    }

    return (
      <CameraView
        facing="front"
        style={styles.camera}
        mirror={Platform.OS !== 'web'}>
        <View style={styles.cameraOverlay}>
          <View style={styles.rppgGuideWrap}>
            <View style={[styles.faceGuide, {borderColor: theme.colors.primary}]} />
            <View
              style={[
                styles.roiZone,
                styles.foreheadZone,
                {
                  backgroundColor: theme.colors.primary + '26',
                  borderColor: theme.colors.primary,
                },
              ]}>
              <Text style={styles.roiLabel}>Trán</Text>
            </View>
            <View
              style={[
                styles.roiZone,
                styles.leftNoseZone,
                {
                  backgroundColor: theme.colors.secondary + '2A',
                  borderColor: theme.colors.secondary,
                },
              ]}
            />
            <View
              style={[
                styles.roiZone,
                styles.rightNoseZone,
                {
                  backgroundColor: theme.colors.secondary + '2A',
                  borderColor: theme.colors.secondary,
                },
              ]}
            />
            <View
              style={[
                styles.roiZone,
                styles.leftCheekZone,
                {
                  backgroundColor: theme.colors.accent + '26',
                  borderColor: theme.colors.accent,
                },
              ]}>
              <Text style={styles.roiLabel}>Má</Text>
            </View>
            <View
              style={[
                styles.roiZone,
                styles.rightCheekZone,
                {
                  backgroundColor: theme.colors.accent + '26',
                  borderColor: theme.colors.accent,
                },
              ]}>
              <Text style={styles.roiLabel}>Má</Text>
            </View>
            <View style={[styles.scanLine, {backgroundColor: theme.colors.primary}]} />
          </View>
          <Text style={styles.overlayText}>
            Đặt trán, hai má và hai bên sống mũi trong vùng quét
          </Text>
        </View>
      </CameraView>
    );
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, {backgroundColor: theme.colors.cardLight}]}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            Face rPPG
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            Camera measurement UI
          </Text>
        </View>
      </View>

      <View style={[styles.cameraCard, {backgroundColor: theme.colors.card}]}>
        {renderCameraContent()}
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={[styles.statusLabel, {color: theme.colors.textSecondary}]}>
              Trạng thái
            </Text>
            <Text style={[styles.statusValue, {color: theme.colors.text}]}>
              {phase === 'idle'
                ? 'Sẵn sàng'
                : phase === 'measuring'
                  ? 'Đang đo'
                  : 'Đang phân tích'}
            </Text>
          </View>
          <View style={[styles.timerPill, {backgroundColor: theme.colors.primary + '16'}]}>
            <MaterialIcons name="timer" size={18} color={theme.colors.primary} />
            <Text style={[styles.timerText, {color: theme.colors.primary}]}>
              {secondsLeft}s
            </Text>
          </View>
        </View>

        <View style={[styles.progressTrack, {backgroundColor: theme.colors.cardLight}]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>

        <Text style={[styles.helper, {color: theme.colors.textSecondary}]}>
          Ngồi yên, giữ điện thoại ngang tầm mắt và tránh ánh sáng thay đổi mạnh.
        </Text>
      </Card>

      <View style={styles.actions}>
        {phase === 'measuring' ? (
          <Button
            title="Hủy đo"
            icon="close"
            variant="outline"
            onPress={cancelMeasurement}
          />
        ) : (
          <Button
            title={phase === 'analyzing' ? 'Đang phân tích...' : 'Bắt đầu đo'}
            icon={phase === 'analyzing' ? 'hourglass-empty' : 'play-arrow'}
            loading={phase === 'analyzing'}
            disabled={phase === 'analyzing'}
            onPress={startMeasurement}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cameraCard: {
    flex: 1,
    minHeight: 340,
    borderRadius: 18,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  rppgGuideWrap: {
    width: 286,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 276,
    height: 340,
    borderRadius: 138,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  roiZone: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foreheadZone: {
    top: 48,
    width: 116,
    height: 48,
    borderRadius: 22,
  },
  leftNoseZone: {
    top: 128,
    left: 114,
    width: 28,
    height: 78,
    borderRadius: 14,
  },
  rightNoseZone: {
    top: 128,
    right: 114,
    width: 28,
    height: 78,
    borderRadius: 14,
  },
  leftCheekZone: {
    top: 174,
    left: 42,
    width: 74,
    height: 58,
    borderRadius: 26,
  },
  rightCheekZone: {
    top: 174,
    right: 42,
    width: 74,
    height: 58,
    borderRadius: 26,
  },
  roiLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  scanLine: {
    position: 'absolute',
    width: 230,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  overlayText: {
    position: 'absolute',
    bottom: 24,
    paddingHorizontal: 24,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  cameraFallback: {
    flex: 1,
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  cameraText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 6,
  },
  statusCard: {
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusValue: {
    fontSize: 19,
    fontWeight: '900',
    marginTop: 2,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: 10,
  },
});

export default FaceRppgScreen;
