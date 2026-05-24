import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY_TRADE_COUNT = 'rating_trade_count';
const KEY_RATED = 'rating_done';

// 取引記録の保存成功後に呼ぶ。一定回数 (5/15/50) でストアレビューを促す。
export async function checkRatingPrompt() {
  try {
    const alreadyRated = await AsyncStorage.getItem(KEY_RATED);
    if (alreadyRated === 'true') return;

    const countStr = await AsyncStorage.getItem(KEY_TRADE_COUNT);
    const count = parseInt(countStr || '0', 10) + 1;
    await AsyncStorage.setItem(KEY_TRADE_COUNT, String(count));

    if (count === 5 || count === 15 || count === 50) {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        // 保存直後の操作と被らないよう少し待ってから促す
        setTimeout(async () => {
          try {
            await StoreReview.requestReview();
          } catch {
            // レビュー要求の失敗は無視
          }
          if (count === 50) {
            await AsyncStorage.setItem(KEY_RATED, 'true');
          }
        }, 2000);
      }
    }
  } catch {
    // レーティング促進はベストエフォート。失敗してもアプリに影響させない。
  }
}
