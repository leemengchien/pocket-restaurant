import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: '口袋餐廳',
  description: '記錄想吃與吃過的餐廳，跨裝置雲端同步',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '口袋餐廳' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
  themeColor: '#e8590c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
