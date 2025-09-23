'use client';

import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, TrendingUp, Users, DollarSign } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationSystem({ notifications, onMarkAsRead, onClearAll }: NotificationSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'achievement':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'achievement':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="relative">
      {/* 通知ベル */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-red-600 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">通知</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  すべて既読
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                通知はありません
              </div>
            ) : (
              notifications
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-red-50' : ''
                    }`}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.timestamp.toLocaleString('ja-JP')}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 通知生成ユーティリティ
export const generateNotifications = (data: any): Notification[] => {
  const notifications: Notification[] = [];
  const now = new Date();

  // 売上目標達成通知
  if (data.totalRevenue > 100000) {
    notifications.push({
      id: `revenue-${now.getTime()}`,
      type: 'achievement',
      title: '売上目標達成！',
      message: `月間売上が${data.totalRevenue.toLocaleString()}円を達成しました！`,
      timestamp: now,
      read: false,
      data: { revenue: data.totalRevenue }
    });
  }

  // 新規顧客通知
  if (data.newCustomers > 0) {
    notifications.push({
      id: `new-customers-${now.getTime()}`,
      type: 'success',
      title: '新規顧客獲得',
      message: `${data.newCustomers}名の新規顧客が追加されました`,
      timestamp: now,
      read: false,
      data: { newCustomers: data.newCustomers }
    });
  }

  // リピート率向上通知
  if (data.repeatRate > 30) {
    notifications.push({
      id: `repeat-rate-${now.getTime()}`,
      type: 'achievement',
      title: 'リピート率向上',
      message: `リピート率が${data.repeatRate.toFixed(1)}%に達しました！`,
      timestamp: now,
      read: false,
      data: { repeatRate: data.repeatRate }
    });
  }

  // 異常な売上パターン通知
  if (data.averageTransactionValue > 50000) {
    notifications.push({
      id: `high-avg-${now.getTime()}`,
      type: 'warning',
      title: '高額取引検出',
      message: `平均取引額が${data.averageTransactionValue.toLocaleString()}円と高額です`,
      timestamp: now,
      read: false,
      data: { averageTransactionValue: data.averageTransactionValue }
    });
  }

  return notifications;
};
