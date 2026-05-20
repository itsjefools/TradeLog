import { Redirect } from 'expo-router';

// Premium 購入画面はスクール配下に統合された。既存リンクの互換のためリダイレクト
export default function PremiumRedirect() {
  return <Redirect href="/school/premium" />;
}
