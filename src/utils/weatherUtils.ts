// 天気データ取得ユーティリティ（Open-Meteo API使用）

interface WeatherData {
  date: string;
  tokyo: WeatherCode;
  osaka: WeatherCode;
}

interface WeatherCode {
  code: number;
  emoji: string;
  text: string;
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
const weatherCodeMap: Record<number, { emoji: string; text: string }> = {
  0: { emoji: '☀️', text: '快晴' },
  1: { emoji: '🌤️', text: '晴れ' },
  2: { emoji: '⛅', text: '曇り' },
  3: { emoji: '☁️', text: '曇り' },
  45: { emoji: '🌫️', text: '霧' },
  48: { emoji: '🌫️', text: '霧' },
  51: { emoji: '🌦️', text: '小雨' },
  53: { emoji: '🌦️', text: '小雨' },
  55: { emoji: '🌧️', text: '雨' },
  56: { emoji: '🌧️', text: '冷雨' },
  57: { emoji: '🌧️', text: '冷雨' },
  61: { emoji: '🌧️', text: '雨' },
  63: { emoji: '🌧️', text: '雨' },
  65: { emoji: '🌧️', text: '大雨' },
  66: { emoji: '🌧️', text: '冷雨' },
  67: { emoji: '🌧️', text: '冷雨' },
  71: { emoji: '🌨️', text: '小雪' },
  73: { emoji: '🌨️', text: '雪' },
  75: { emoji: '❄️', text: '大雪' },
  77: { emoji: '🌨️', text: '雪' },
  80: { emoji: '🌦️', text: 'にわか雨' },
  81: { emoji: '🌧️', text: 'にわか雨' },
  82: { emoji: '🌧️', text: '豪雨' },
  85: { emoji: '🌨️', text: 'にわか雪' },
  86: { emoji: '❄️', text: 'にわか雪' },
  95: { emoji: '⛈️', text: '雷雨' },
  96: { emoji: '⛈️', text: '雷雨' },
  99: { emoji: '⛈️', text: '雷雨' },
};

const getWeatherInfo = (code: number): { emoji: string; text: string } => {
  return weatherCodeMap[code] || { emoji: '❓', text: '不明' };
};

// 東京の座標
const TOKYO_LAT = 35.6762;
const TOKYO_LON = 139.6503;

// 大阪の座標
const OSAKA_LAT = 34.6937;
const OSAKA_LON = 135.5023;

/**
 * 過去の天気データを取得（Open-Meteo API）
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 * @returns 天気データの配列
 */
export const fetchHistoricalWeather = async (
  startDate: string,
  endDate: string
): Promise<Record<string, { tokyo: WeatherCode; osaka: WeatherCode }>> => {
  try {
    console.log('🌤️ 天気データAPI呼び出し開始:', { startDate, endDate });
    
    // 過去と未来を判定して適切なAPIを選択
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestStartDate = new Date(startDate);
    const requestEndDate = new Date(endDate);
    
    // 7日前より古いデータは過去データAPI、それ以降は予報API
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    let tokyoUrl: string;
    let osakaUrl: string;
    
    if (requestEndDate < sevenDaysAgo) {
      // 過去データAPI（7日以前）
      console.log('📜 過去データAPIを使用');
      tokyoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&start_date=${startDate}&end_date=${endDate}&daily=weather_code&timezone=Asia/Tokyo`;
      osakaUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&start_date=${startDate}&end_date=${endDate}&daily=weather_code&timezone=Asia/Tokyo`;
    } else {
      // 予報API（最近7日 + 未来16日まで）
      console.log('🔮 予報APIを使用（過去7日+未来16日）');
      tokyoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
      osakaUrl = `https://api.open-meteo.com/v1/forecast?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
    }
    
    // 東京の天気を取得
    console.log('📍 東京API URL:', tokyoUrl);
    const tokyoResponse = await fetch(tokyoUrl);
    
    if (!tokyoResponse.ok) {
      console.error('❌ 東京の天気データ取得エラー:', tokyoResponse.status, tokyoResponse.statusText);
      return {};
    }
    
    const tokyoData = await tokyoResponse.json();
    console.log('✅ 東京データ取得成功:', tokyoData);

    // 大阪の天気を取得
    console.log('📍 大阪API URL:', osakaUrl);
    const osakaResponse = await fetch(osakaUrl);
    
    if (!osakaResponse.ok) {
      console.error('❌ 大阪の天気データ取得エラー:', osakaResponse.status, osakaResponse.statusText);
      return {};
    }
    
    const osakaData = await osakaResponse.json();
    console.log('✅ 大阪データ取得成功:', osakaData);

    // データを整形
    const weatherMap: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> = {};

    if (tokyoData.daily && osakaData.daily) {
      const tokyoDates = tokyoData.daily.time;
      const tokyoCodes = tokyoData.daily.weather_code;
      const osakaDates = osakaData.daily.time;
      const osakaCodes = osakaData.daily.weather_code;

      console.log('📅 東京データ:', tokyoDates.length, '日分');
      console.log('📅 大阪データ:', osakaDates.length, '日分');
      console.log('📊 東京天気コード例:', tokyoCodes?.slice(0, 5));
      console.log('📊 大阪天気コード例:', osakaCodes?.slice(0, 5));

      // 東京のデータをベースに処理
      tokyoDates.forEach((date: string, index: number) => {
        // 指定された日付範囲内のデータのみを処理
        if (date >= startDate && date <= endDate) {
          const tokyoCode = tokyoCodes[index];
          
          // 大阪の同じ日付のデータを探す
          const osakaIndex = osakaDates.findIndex((d: string) => d === date);
          const osakaCode = osakaIndex >= 0 ? osakaCodes[osakaIndex] : tokyoCode;
          
          const tokyoInfo = getWeatherInfo(tokyoCode);
          const osakaInfo = getWeatherInfo(osakaCode);

          weatherMap[date] = {
            tokyo: {
              code: tokyoCode,
              emoji: tokyoInfo.emoji,
              text: tokyoInfo.text,
            },
            osaka: {
              code: osakaCode,
              emoji: osakaInfo.emoji,
              text: osakaInfo.text,
            },
          };
          
          // 最初の5日分だけ詳細ログ
          if (Object.keys(weatherMap).length <= 5) {
            console.log(`📅 ${date}: 東京=${tokyoInfo.emoji}${tokyoInfo.text}(${tokyoCode}), 大阪=${osakaInfo.emoji}${osakaInfo.text}(${osakaCode})`);
          }
        }
      });
      
      console.log('✅ 天気マップ作成完了:', Object.keys(weatherMap).length, '日分');
      console.log('📊 日付範囲:', startDate, '〜', endDate);
    } else {
      console.error('❌ 天気データが不正な形式です');
      console.error('東京データ:', tokyoData);
      console.error('大阪データ:', osakaData);
    }

    return weatherMap;
  } catch (error) {
    console.error('❌ 天気データの取得に失敗しました:', error);
    return {};
  }
};

/**
 * ローカルストレージに天気データをキャッシュ
 */
export const cacheWeatherData = (
  weatherData: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }>
): void => {
  try {
    const cacheData = {
      data: weatherData,
      timestamp: Date.now(),
    };
    localStorage.setItem('fanclub-weather-cache', JSON.stringify(cacheData));
  } catch (error) {
    console.error('天気データのキャッシュに失敗しました:', error);
  }
};

/**
 * ローカルストレージから天気データを取得
 * @param maxAge キャッシュの最大有効期間（ミリ秒）デフォルト: 24時間
 */
export const getCachedWeatherData = (
  maxAge: number = 24 * 60 * 60 * 1000
): Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> | null => {
  try {
    const cached = localStorage.getItem('fanclub-weather-cache');
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    // キャッシュが古すぎる場合はnullを返す
    if (age > maxAge) {
      localStorage.removeItem('fanclub-weather-cache');
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error('キャッシュされた天気データの取得に失敗しました:', error);
    return null;
  }
};

/**
 * 天気データを取得（キャッシュ優先）
 */
export const getWeatherData = async (
  startDate: string,
  endDate: string
): Promise<Record<string, { tokyo: WeatherCode; osaka: WeatherCode }>> => {
  // まずキャッシュを確認
  const cached = getCachedWeatherData();
  if (cached) {
    console.log('✅ キャッシュされた天気データを使用');
    return cached;
  }

  // キャッシュがない場合はAPIから取得
  console.log('🌤️ 天気データをAPIから取得中...');
  const weatherData = await fetchHistoricalWeather(startDate, endDate);
  
  // 取得したデータをキャッシュ
  cacheWeatherData(weatherData);
  
  return weatherData;
};

/**
 * 指定された年月の天気データを取得
 */
export const getMonthlyWeatherData = async (
  year: number,
  month: number
): Promise<Record<string, { tokyo: WeatherCode; osaka: WeatherCode }>> => {
  // 月の開始日と終了日を計算
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return getWeatherData(startDate, endDate);
};

/**
 * 過去365日分の天気データを取得
 */
export const getYearlyWeatherData = async (): Promise<
  Record<string, { tokyo: WeatherCode; osaka: WeatherCode }>
> => {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const endDate = today.toISOString().split('T')[0];
  const startDate = oneYearAgo.toISOString().split('T')[0];

  return getWeatherData(startDate, endDate);
};

