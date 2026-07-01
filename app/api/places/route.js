import { createClient } from '@supabase/supabase-js';

// Google Places API (New) 後端代理：
// - 共用 key 只存在伺服器環境變數，前端拿不到
// - 必須帶有效的 Supabase 登入 token 才能呼叫，防止匿名盜刷
// - 參數白名單化，只允許固定的兩種查詢

const FIELD_MASKS = {
  searchText:
    'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.location,places.formattedAddress,places.googleMapsUri',
  parkingNearby: 'places.displayName',
};

export async function POST(req) {
  try {
    // 1. 驗證登入
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user } = {}, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey)
      return Response.json({ error: '伺服器尚未設定 GOOGLE_PLACES_API_KEY' }, { status: 500 });

    // 2. 組安全的請求 body（白名單）
    const b = await req.json();
    let url, body, mask;

    if (b.kind === 'searchText') {
      const textQuery = String(b.textQuery || '').slice(0, 200).trim();
      if (!textQuery) return Response.json({ error: 'textQuery required' }, { status: 400 });
      url = 'https://places.googleapis.com/v1/places:searchText';
      mask = FIELD_MASKS.searchText;
      body = {
        textQuery,
        languageCode: 'zh-TW',
        maxResultCount: Math.min(Math.max(Number(b.maxResultCount) || 10, 1), 20),
      };
      const lat = Number(b.bias?.lat), lng = Number(b.bias?.lng);
      if (isFinite(lat) && isFinite(lng)) {
        body.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(Math.max(Number(b.bias?.radius) || 5000, 1), 50000),
          },
        };
      }
    } else if (b.kind === 'parkingNearby') {
      const lat = Number(b.lat), lng = Number(b.lng);
      if (!isFinite(lat) || !isFinite(lng))
        return Response.json({ error: 'lat/lng required' }, { status: 400 });
      url = 'https://places.googleapis.com/v1/places:searchNearby';
      mask = FIELD_MASKS.parkingNearby;
      body = {
        includedTypes: ['parking'],
        maxResultCount: 3,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(Math.max(Number(b.radius) || 50, 1), 500),
          },
        },
      };
    } else {
      return Response.json({ error: 'unknown kind' }, { status: 400 });
    }

    // 3. 轉發到 Google
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': mask,
      },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok)
      return Response.json(
        { error: j.error?.message || 'Google API HTTP ' + res.status },
        { status: 502 }
      );
    return Response.json(j);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
