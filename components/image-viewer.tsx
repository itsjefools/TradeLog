import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const ANIM_MS = 160;

export function ImageViewer({
  visible,
  uris,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  // ズーム中はページャーのスワイプを無効化
  const [pagingEnabled, setPagingEnabled] = useState(true);
  const styles = useMemo(() => makeStyles(), []);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setPagingEnabled(true);
    }
  }, [visible, initialIndex]);

  const onScroll = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_WIDTH);
    if (next !== index) setIndex(next);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <ScrollView
          horizontal
          pagingEnabled={pagingEnabled}
          scrollEnabled={pagingEnabled}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {uris.map((uri) => (
            <ZoomableImage
              key={uri}
              uri={uri}
              onClose={onClose}
              onZoomChange={setPagingEnabled}
            />
          ))}
        </ScrollView>

        {/* X ボタンと枚数表示は ScrollView の上に重ねるため最後に描画 */}
        {uris.length > 1 && (
          <View pointerEvents="none" style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1} / {uris.length}
            </Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && styles.closeBtnPressed,
          ]}
          onPress={onClose}
          hitSlop={24}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({
  uri,
  onClose,
  onZoomChange,
}: {
  uri: string;
  onClose: () => void;
  onZoomChange: (canSwipe: boolean) => void;
}) {
  const styles = useMemo(() => makeStyles(), []);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  // Pan ジェスチャーを scale > 1 のときだけ有効化するための React state
  const [zoomed, setZoomed] = useState(false);

  const updateZoomState = useCallback(
    (z: boolean) => {
      setZoomed(z);
      // 親のページャー有効/無効を切替
      onZoomChange(!z);
    },
    [onZoomChange],
  );

  const resetInstant = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
    updateZoomState(false);
  }, [scale, savedScale, tx, ty, savedTx, savedTy, updateZoomState]);

  const animateReset = useCallback(() => {
    scale.value = withTiming(1, { duration: ANIM_MS });
    tx.value = withTiming(0, { duration: ANIM_MS });
    ty.value = withTiming(0, { duration: ANIM_MS });
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
    updateZoomState(false);
  }, [scale, savedScale, tx, ty, savedTx, savedTy, updateZoomState]);

  // Pinch: scale を 1〜MAX_SCALE にクランプ。1以下に縮もうとしても下限ロック
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => {
          const next = Math.max(
            1,
            Math.min(MAX_SCALE, savedScale.value * e.scale),
          );
          scale.value = next;
        })
        .onEnd(() => {
          if (scale.value <= 1.01) {
            runOnJS(resetInstant)();
          } else {
            savedScale.value = scale.value;
            runOnJS(updateZoomState)(true);
          }
        }),
    [scale, savedScale, resetInstant, updateZoomState],
  );

  // Pan: scale > 1 のときだけ有効。zoomed=false なら作成しない
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .averageTouches(true)
        .enabled(zoomed)
        .onUpdate((e) => {
          tx.value = savedTx.value + e.translationX;
          ty.value = savedTy.value + e.translationY;
        })
        .onEnd(() => {
          savedTx.value = tx.value;
          savedTy.value = ty.value;
        }),
    [zoomed, tx, ty, savedTx, savedTy],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
          if (scale.value > 1.01) {
            runOnJS(animateReset)();
          } else {
            scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: ANIM_MS });
            savedScale.value = DOUBLE_TAP_SCALE;
            runOnJS(updateZoomState)(true);
          }
        }),
    [scale, savedScale, animateReset, updateZoomState],
  );

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .requireExternalGestureToFail(doubleTap)
        .onStart(() => {
          if (scale.value <= 1.01) {
            runOnJS(onClose)();
          }
        }),
    [doubleTap, scale, onClose],
  );

  const composed = useMemo(
    () =>
      Gesture.Simultaneous(
        pinch,
        pan,
        Gesture.Exclusive(doubleTap, singleTap),
      ),
    [pinch, pan, doubleTap, singleTap],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.page}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.zoomable, animStyle]}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    closeBtn: {
      position: 'absolute',
      top: 50,
      right: 12,
      zIndex: 100,
      elevation: 100,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnPressed: {
      opacity: 0.6,
    },
    counter: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    counterText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    page: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomable: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT * 0.85,
    },
  });
}
