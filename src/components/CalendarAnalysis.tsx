'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import { FanClubRevenueData } from '@/types/csv';
import { formatCurrency } from '@/utils/csvUtils';
import { useGlobalModelSelectionListener } from '@/hooks/useGlobalModelSelection';

interface CalendarAnalysisProps {
  allData: FanClubRevenueData[];
  modelData: Record<string, { data: FanClubRevenueData[]; modelId: string; modelName: string }>;
  models: { id: string; displayName: string; isMainModel?: boolean }[];
}

interface DayData {
  date: number;
  revenue: number;
  transactions: number;
}

interface HourData {
  hour: number;
  revenue: number;
  transactions: number;
}

interface WeekdayHourData {
  [weekday: number]: {
    [hour: number]: {
      revenue: number;
      transactions: number;
    };
  };
}

export default function CalendarAnalysis({ allData, modelData, models }: CalendarAnalysisProps) {
  // グローバル状態から初期値を取得
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const savedSelection = localStorage.getItem('fanclub-global-model-selection');
    if (savedSelection) {
      try {
        const { selectedModelId: savedModelId } = JSON.parse(savedSelection);
        return savedModelId || 'all';
      } catch (error) {
        console.warn('Failed to parse saved model selection:', error);
      }
    }
    // メインモデルがあれば優先選択、なければ全体
    const mainModel = models.find(m => m.isMainModel);
    return mainModel?.id || 'all';
  });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [weekdayHourData, setWeekdayHourData] = useState<WeekdayHourData>({});

  // グローバルなモデル選択変更をリッスン
  const handleGlobalModelSelectionChange = useCallback((globalSelectedModelId: string) => {
    console.log('📅 カレンダー分析: グローバルモデル選択変更:', globalSelectedModelId);
    setSelectedModelId(globalSelectedModelId);
  }, []);

  useGlobalModelSelectionListener(handleGlobalModelSelectionChange);

  // メインモデル変更イベントをリッスン
  useEffect(() => {
    const handleMainModelChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { modelId } = customEvent.detail;
      console.log('📅 カレンダー分析: メインモデル変更イベント受信:', modelId);
      
      // メインモデルが解除された場合（modelIdがnull）
      if (modelId === null) {
        console.log('📅 カレンダー分析: メインモデル解除、全体を選択');
        setSelectedModelId('all');
      } else {
        setSelectedModelId(modelId);
      }
    };

    window.addEventListener('mainModelChanged', handleMainModelChange);
    
    return () => {
      window.removeEventListener('mainModelChanged', handleMainModelChange);
    };
  }, []);

  // データを分析
  useEffect(() => {
    console.log('📅 カレンダー分析: データ分析開始');
    console.log('📅 カレンダー分析: allData:', allData.length, '件');
    console.log('📅 カレンダー分析: modelData keys:', Object.keys(modelData));
    console.log('📅 カレンダー分析: selectedModelId:', selectedModelId);
    
    // 選択されたモデルのデータを取得
    const data = selectedModelId === 'all'
      ? allData
      : Object.values(modelData)
          .filter(item => item.modelId === selectedModelId)
          .flatMap(item => item.data);

    console.log('📅 カレンダー分析: 分析対象データ:', data.length, '件');

    if (!data || data.length === 0) {
      console.log('📅 カレンダー分析: データがないため、空の状態を設定');
      setCalendarData([]);
      setHourlyData([]);
      setWeekdayHourData({});
      return;
    }

    // 月別カレンダーデータを集計
    const dayMap = new Map<number, DayData>();
    const hourMap = new Map<number, HourData>();
    const weekdayHourMap: WeekdayHourData = {};

    // 初期化
    for (let i = 0; i < 7; i++) {
      weekdayHourMap[i] = {};
      for (let h = 0; h < 24; h++) {
        weekdayHourMap[i][h] = { revenue: 0, transactions: 0 };
      }
    }

    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { hour: h, revenue: 0, transactions: 0 });
    }

    data.forEach(record => {
      if (!record.日付) return;
      
      const date = new Date(record.日付);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const weekday = date.getDay();
      const amount = Number(record.金額) || 0;

      // 選択された年月のデータのみ
      if (year === selectedYear && month === selectedMonth) {
        // 日別データ
        if (!dayMap.has(day)) {
          dayMap.set(day, { date: day, revenue: 0, transactions: 0 });
        }
        const dayData = dayMap.get(day)!;
        dayData.revenue += amount;
        dayData.transactions += 1;
      }

      // 時間帯データ（全期間）
      const hourData = hourMap.get(hour)!;
      hourData.revenue += amount;
      hourData.transactions += 1;

      // 曜日×時間帯データ（全期間）
      weekdayHourMap[weekday][hour].revenue += amount;
      weekdayHourMap[weekday][hour].transactions += 1;
    });

    const finalCalendarData = Array.from(dayMap.values()).sort((a, b) => a.date - b.date);
    const finalHourlyData = Array.from(hourMap.values());
    
    console.log('📅 カレンダー分析: 処理完了');
    console.log('📅 カレンダー分析: カレンダーデータ:', finalCalendarData.length, '日');
    console.log('📅 カレンダー分析: 時間別データ:', finalHourlyData.length, '時間');
    
    setCalendarData(finalCalendarData);
    setHourlyData(finalHourlyData);
    setWeekdayHourData(weekdayHourMap);
  }, [allData, modelData, selectedModelId, selectedYear, selectedMonth]);

  // 最大値を取得（ヒートマップの色濃度用）
  const maxRevenue = Math.max(...calendarData.map(d => d.revenue), 1);
  const maxHourRevenue = Math.max(...hourlyData.map(d => d.revenue), 1);

  // 色の濃淡を計算
  const getColorIntensity = (value: number, max: number) => {
    const intensity = Math.min(value / max, 1);
    if (intensity === 0) return 'bg-gray-50';
    if (intensity < 0.2) return 'bg-pink-100';
    if (intensity < 0.4) return 'bg-pink-200';
    if (intensity < 0.6) return 'bg-pink-300';
    if (intensity < 0.8) return 'bg-pink-400';
    return 'bg-pink-500';
  };

  // カレンダーのグリッドを生成
  const generateCalendar = () => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const weeks = [];
    let week = [];

    // 最初の週の空白
    for (let i = 0; i < firstDay; i++) {
      week.push(null);
    }

    // 日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // 最後の週の空白
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const weeks = generateCalendar();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  // 利用可能な年を取得（useMemoで最適化）
  const availableYears = useMemo(() => {
    return Array.from(new Set(
      allData.map(record => {
        if (!record.日付) return null;
        const date = new Date(record.日付);
        return isNaN(date.getTime()) ? null : date.getFullYear();
      }).filter((year): year is number => year !== null)
    )).sort((a, b) => b - a);
  }, [allData]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">カレンダー分析</h1>
        <p className="text-gray-600">購入タイミングとパターンを可視化</p>
        <div className="mt-2 text-sm text-gray-500">
          モデル数: {models.length} | 選択中: {selectedModelId}
        </div>
      </div>

      {/* モデル選択と年月選択 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* モデル選択 */}
          <div className="flex items-center space-x-3">
            <label htmlFor="calendar-model-select" className="text-sm font-medium text-gray-700">
              モデル選択:
            </label>
            <select
              id="calendar-model-select"
              value={selectedModelId}
              onChange={(e) => {
                console.log('カレンダー分析: モデル選択変更:', e.target.value);
                setSelectedModelId(e.target.value);
                // グローバル状態も更新
                localStorage.setItem('fanclub-global-model-selection', JSON.stringify({ selectedModelId: e.target.value }));
                window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
                  detail: { selectedModelId: e.target.value } 
                }));
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900 min-w-[200px]"
            >
              <option value="all">全体</option>
              {models.length > 0 ? (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                  </option>
                ))
              ) : (
                <option value="" disabled>モデルが見つかりません</option>
              )}
            </select>
          </div>
          
          {/* 年月選択 */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">表示期間:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 月別カレンダーヒートマップ */}
      <div className="bg-white border border-pink-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-pink-600" />
          <span>月別カレンダーヒートマップ</span>
        </h3>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {weekdays.map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* カレンダーグリッド */}
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <div key={`week-${weekIndex}-empty-${dayIndex}`} className="aspect-square" />;
                  }
                  
                  const dayData = calendarData.find(d => d.date === day);
                  const revenue = dayData?.revenue || 0;
                  const transactions = dayData?.transactions || 0;
                  const colorClass = getColorIntensity(revenue, maxRevenue);
                  
                  return (
                    <div
                      key={`week-${weekIndex}-day-${day}`}
                      className={`aspect-square ${colorClass} rounded-md sm:rounded-lg p-1 sm:p-2 cursor-pointer hover:ring-2 hover:ring-pink-500 transition-all group relative`}
                      title={`${day}日: ${formatCurrency(revenue)} (${transactions}件)`}
                    >
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{day}</div>
                      {transactions > 0 && (
                        <div className="text-[10px] sm:text-xs text-gray-700 mt-0.5 sm:mt-1 leading-tight">
                          <div className="font-medium truncate">{formatCurrency(revenue)}</div>
                          <div className="truncate">{transactions}件</div>
                        </div>
                      )}
                      
                      {/* ホバー時の詳細 */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                          <div className="font-bold">{selectedYear}年{selectedMonth}月{day}日</div>
                          <div>売上: {formatCurrency(revenue)}</div>
                          <div>件数: {transactions}件</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* 凡例 */}
        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-600">
          <span>少ない</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <div className="w-4 h-4 bg-pink-100 rounded"></div>
            <div className="w-4 h-4 bg-pink-200 rounded"></div>
            <div className="w-4 h-4 bg-pink-300 rounded"></div>
            <div className="w-4 h-4 bg-pink-400 rounded"></div>
            <div className="w-4 h-4 bg-pink-500 rounded"></div>
          </div>
          <span>多い</span>
        </div>
      </div>

      {/* 時間帯別購入分析 */}
      <div className="bg-white border border-pink-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-pink-600" />
          <span>時間帯別購入分析</span>
        </h3>
        
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
          {hourlyData.map(({ hour, revenue, transactions }) => {
            const colorClass = getColorIntensity(revenue, maxHourRevenue);
            
            return (
              <div
                key={hour}
                className={`${colorClass} rounded-lg p-3 text-center cursor-pointer hover:ring-2 hover:ring-pink-500 transition-all group relative`}
                title={`${hour}時: ${formatCurrency(revenue)} (${transactions}件)`}
              >
                <div className="text-xs font-semibold text-gray-900">{hour}時</div>
                <div className="text-xs text-gray-700 mt-1">{transactions}件</div>
                
                {/* ホバー時の詳細 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                    <div className="font-bold">{hour}:00 - {hour}:59</div>
                    <div>売上: {formatCurrency(revenue)}</div>
                    <div>件数: {transactions}件</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 曜日×時間帯ヒートマップ */}
      <div className="bg-white border border-pink-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-pink-600" />
          <span>曜日×時間帯ヒートマップ</span>
        </h3>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* 時間ヘッダー */}
            <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(24, 1fr)' }}>
              <div></div>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={`hour-header-${i}`} className="text-xs text-center font-medium text-gray-600">
                {i}
              </div>
            ))}
            </div>
            
            {/* 曜日×時間帯グリッド */}
            {weekdays.map((weekday, weekdayIndex) => {
              const maxWeekdayRevenue = Math.max(
                ...Object.values(weekdayHourData[weekdayIndex] || {}).map(d => d.revenue),
                1
              );
              
              return (
                <div key={weekdayIndex} className="grid gap-1 mt-1" style={{ gridTemplateColumns: '60px repeat(24, 1fr)' }}>
                  <div className="text-sm font-medium text-gray-700 flex items-center">
                    {weekday}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const data = weekdayHourData[weekdayIndex]?.[hour] || { revenue: 0, transactions: 0 };
                    const colorClass = getColorIntensity(data.revenue, maxWeekdayRevenue);
                    
                    return (
                      <div
                        key={`weekday-${weekdayIndex}-hour-${hour}`}
                        className={`${colorClass} aspect-square rounded cursor-pointer hover:ring-2 hover:ring-pink-500 transition-all group relative`}
                        title={`${weekday} ${hour}時: ${formatCurrency(data.revenue)} (${data.transactions}件)`}
                      >
                        {/* ホバー時の詳細 */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                            <div className="font-bold">{weekday}曜日 {hour}:00</div>
                            <div>売上: {formatCurrency(data.revenue)}</div>
                            <div>件数: {data.transactions}件</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-pink-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">最も売上の多い日</p>
              <p className="text-xl font-bold text-gray-900">
                {calendarData.length > 0
                  ? `${calendarData.reduce((max, d) => d.revenue > max.revenue ? d : max).date}日`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-pink-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">最も売上の多い時間帯</p>
              <p className="text-xl font-bold text-gray-900">
                {hourlyData.length > 0
                  ? `${hourlyData.reduce((max, d) => d.revenue > max.revenue ? d : max).hour}時台`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-pink-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">月間平均購入額</p>
              <p className="text-xl font-bold text-gray-900">
                {calendarData.length > 0
                  ? formatCurrency(calendarData.reduce((sum, d) => sum + d.revenue, 0) / calendarData.length)
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

