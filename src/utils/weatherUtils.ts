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

/**
 * 天気データを処理して統一フォーマットに変換
 */
const processWeatherData = (
  tokyoData: any,
  osakaData: any,
  startDate: string,
  endDate: string
): Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> => {
  const weatherMap: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> = {};
  
  console.log('🔍 processWeatherData 開始');
  console.log('  startDate:', startDate);
  console.log('  endDate:', endDate);
  console.log('  tokyoData:', tokyoData ? 'あり' : 'なし');
  console.log('  osakaData:', osakaData ? 'あり' : 'なし');
  
  if (!tokyoData || !tokyoData.daily) {
    console.error('❌ 東京データが不正:', tokyoData);
    return {};
  }
  
  if (!osakaData || !osakaData.daily) {
    console.error('❌ 大阪データが不正:', osakaData);
    return {};
  }
  
  const tokyoDates = tokyoData.daily.time;
  const tokyoCodes = tokyoData.daily.weather_code;
  const osakaDates = osakaData.daily.time;
  const osakaCodes = osakaData.daily.weather_code;
  
  console.log(`📅 東京: ${tokyoDates?.length || 0}日分`);
  console.log(`📅 大阪: ${osakaDates?.length || 0}日分`);
  console.log(`📅 東京日付例:`, tokyoDates?.slice(0, 3));
  console.log(`📅 東京コード例:`, tokyoCodes?.slice(0, 3));
  
  if (!tokyoDates || !tokyoCodes || !osakaDates || !osakaCodes) {
    console.error('❌ 必要なフィールドがありません');
    return {};
  }
  
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
      
      // 最初の3日分だけログ
      if (Object.keys(weatherMap).length <= 3) {
        console.log(`  ${date}: ${tokyoInfo.emoji} ${osakaInfo.emoji}`);
      }
    }
  });
  
  console.log(`✅ 処理完了: ${Object.keys(weatherMap).length}日分`);
  return weatherMap;
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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestStartDate = new Date(startDate);
    const requestEndDate = new Date(endDate);
    
    // 7日前の日付
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const weatherMap: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> = {};
    
    // ケース1: 完全に過去のデータ（7日以前）
    if (requestEndDate < sevenDaysAgo) {
      console.log('📜 過去データAPIのみ使用');
      console.log('📅 リクエスト範囲:', startDate, '〜', endDate);
      
      const tokyoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&start_date=${startDate}&end_date=${endDate}&daily=weather_code&timezone=Asia/Tokyo`;
      const osakaUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&start_date=${startDate}&end_date=${endDate}&daily=weather_code&timezone=Asia/Tokyo`;
      
      console.log('📜 過去API URL:', tokyoUrl);
      
      const [tokyoRes, osakaRes] = await Promise.all([
        fetch(tokyoUrl),
        fetch(osakaUrl)
      ]);
      
      console.log('📜 東京レスポンス:', tokyoRes.status, tokyoRes.statusText);
      console.log('📜 大阪レスポンス:', osakaRes.status, osakaRes.statusText);
      
      if (!tokyoRes.ok || !osakaRes.ok) {
        console.error('❌ 過去データ取得エラー');
        if (!tokyoRes.ok) {
          const errorText = await tokyoRes.text();
          console.error('東京エラー詳細:', errorText);
        }
        if (!osakaRes.ok) {
          const errorText = await osakaRes.text();
          console.error('大阪エラー詳細:', errorText);
        }
        return {};
      }
      
      const tokyoData = await tokyoRes.json();
      const osakaData = await osakaRes.json();
      
      console.log('📜 過去データ取得成功');
      return processWeatherData(tokyoData, osakaData, startDate, endDate);
    }
    
    // ケース2: 最近〜未来のデータ（予報APIのみで足りる）
    if (requestStartDate >= sevenDaysAgo) {
      console.log('🔮 予報APIのみ使用');
      const tokyoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
      const osakaUrl = `https://api.open-meteo.com/v1/forecast?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
      
      const [tokyoRes, osakaRes] = await Promise.all([
        fetch(tokyoUrl),
        fetch(osakaUrl)
      ]);
      
      if (!tokyoRes.ok || !osakaRes.ok) {
        console.error('❌ 予報データ取得エラー');
        return {};
      }
      
      const tokyoData = await tokyoRes.json();
      const osakaData = await osakaRes.json();
      
      return processWeatherData(tokyoData, osakaData, startDate, endDate);
    }
    
    // ケース3: 過去と最近の両方にまたがる（両方のAPIを使用）
    console.log('📜🔮 過去データAPI + 予報API 両方使用');
    console.log('📅 今日:', today.toISOString().split('T')[0]);
    console.log('📅 7日前:', sevenDaysAgo.toISOString().split('T')[0]);
    
    // 過去データAPIで取得する範囲（開始日〜8日前まで）
    // 予報APIのpast_days=7は「7日前から」なので、8日前までを過去APIで取得
    const historicalEndDate = new Date(today);
    historicalEndDate.setDate(historicalEndDate.getDate() - 8);
    const historicalEndStr = historicalEndDate.toISOString().split('T')[0];
    
    // 予報APIの開始日（7日前）
    const forecastStartDate = new Date(today);
    forecastStartDate.setDate(forecastStartDate.getDate() - 7);
    const forecastStartStr = forecastStartDate.toISOString().split('T')[0];
    
    console.log(`📜 過去データ範囲: ${startDate} 〜 ${historicalEndStr}`);
    console.log(`🔮 予報データ範囲: ${forecastStartStr} 〜 ${endDate}`);
    
    // 過去データを取得（開始日が8日前より古い場合のみ）
    let historicalWeather: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> = {};
    
    if (requestStartDate <= historicalEndDate) {
      console.log('📜 過去データAPIを呼び出し中...');
      const actualHistEndStr = requestEndDate < historicalEndDate ? endDate : historicalEndStr;
      
      const tokyoHistUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&start_date=${startDate}&end_date=${actualHistEndStr}&daily=weather_code&timezone=Asia/Tokyo`;
      const osakaHistUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&start_date=${startDate}&end_date=${actualHistEndStr}&daily=weather_code&timezone=Asia/Tokyo`;
      
      console.log('📜 過去API URL例:', tokyoHistUrl);
      
      const [tokyoHistRes, osakaHistRes] = await Promise.all([
        fetch(tokyoHistUrl),
        fetch(osakaHistUrl)
      ]);
      
      if (tokyoHistRes.ok && osakaHistRes.ok) {
        const tokyoHistData = await tokyoHistRes.json();
        const osakaHistData = await osakaHistRes.json();
        historicalWeather = processWeatherData(tokyoHistData, osakaHistData, startDate, actualHistEndStr);
        console.log('✅ 過去データ取得成功:', Object.keys(historicalWeather).length, '日分');
      } else {
        console.error('❌ 過去データ取得エラー:', tokyoHistRes.status, osakaHistRes.status);
      }
    } else {
      console.log('⏭️ 過去データAPIはスキップ（範囲外）');
    }
    
    // 予報データを取得（終了日が7日前以降の場合のみ）
    let forecastWeather: Record<string, { tokyo: WeatherCode; osaka: WeatherCode }> = {};
    
    if (requestEndDate >= forecastStartDate) {
      console.log('🔮 予報APIを呼び出し中...');
      const tokyoForeUrl = `https://api.open-meteo.com/v1/forecast?latitude=${TOKYO_LAT}&longitude=${TOKYO_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
      const osakaForeUrl = `https://api.open-meteo.com/v1/forecast?latitude=${OSAKA_LAT}&longitude=${OSAKA_LON}&daily=weather_code&timezone=Asia/Tokyo&past_days=7&forecast_days=16`;
      
      console.log('🔮 予報API URL例:', tokyoForeUrl);
      
      const [tokyoForeRes, osakaForeRes] = await Promise.all([
        fetch(tokyoForeUrl),
        fetch(osakaForeUrl)
      ]);
      
      if (tokyoForeRes.ok && osakaForeRes.ok) {
        const tokyoForeData = await tokyoForeRes.json();
        const osakaForeData = await osakaForeRes.json();
        forecastWeather = processWeatherData(tokyoForeData, osakaForeData, forecastStartStr, endDate);
        console.log('✅ 予報データ取得成功:', Object.keys(forecastWeather).length, '日分');
      } else {
        console.error('❌ 予報データ取得エラー:', tokyoForeRes.status, osakaForeRes.status);
      }
    } else {
      console.log('⏭️ 予報APIはスキップ（範囲外）');
    }
    
    // 統合
    const combined = { ...historicalWeather, ...forecastWeather };
    console.log(`✅ 統合完了: ${Object.keys(combined).length}日分 (過去:${Object.keys(historicalWeather).length}, 予報:${Object.keys(forecastWeather).length})`);
    return combined;
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

