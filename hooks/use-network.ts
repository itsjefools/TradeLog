import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * デバイスのネットワーク到達性を購読する。
 * - isConnected: NetInfo の isConnected (ハードウェア接続レベル)
 * - isInternetReachable: 実際にインターネットにアクセスできるか
 *   (Android では数秒遅れる、iOS では null になりうる)
 * - isOffline: 上記いずれかが false の時 true (UI 判定の主用途はこれ)
 */
export function useNetwork() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] =
    useState<boolean | null>(true);

  useEffect(() => {
    let mounted = true;
    // マウント時に現在の状態をスナップショット
    NetInfo.fetch().then((state: NetInfoState) => {
      if (!mounted) return;
      setIsConnected(!!state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(!!state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const isOffline = !isConnected || isInternetReachable === false;

  return { isConnected, isInternetReachable, isOffline };
}
