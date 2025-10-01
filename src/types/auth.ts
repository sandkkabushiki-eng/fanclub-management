// 認証関連の型定義
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  subscription?: {
    plan: 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt: string;
  };
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// 管理者専用の統計情報
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
  };
  popularPlans: {
    plan: string;
    count: number;
  }[];
}


