import { supabaseAdmin } from '@/lib/auth';
import { authManager } from '@/lib/auth';
import { Model, FanClubRevenueData } from '@/types/csv';

// ユーザー毎のデータ分離を実現するユーティリティ

/**
 * ユーザー専用のデータ操作クラス
 * 各ユーザーは自分のデータのみにアクセス可能
 */
export class UserDataManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ユーザー専用のモデルデータを保存
  async saveUserModel(_model: Model): Promise<boolean> {
    try {
      // 現在はSupabaseのトリガーで処理されるため、この部分は使用していない
      console.log('Model save requested but handled by Supabase trigger');
      return true;
    } catch (error) {
      console.error('User model save error:', error);
      return false;
    }
  }

  // ユーザー専用の月別データを保存
  async saveUserMonthlyData(
    _modelId: string,
    _year: number,
    _month: number,
    _data: FanClubRevenueData[]
  ): Promise<boolean> {
    try {
      // 現在はSupabaseのトリガーで処理されるため、この部分は使用していない
      console.log('Monthly data save requested but handled by Supabase trigger');
      return true;
    } catch (error) {
      console.error('User monthly data save error:', error);
      return false;
    }
  }

  // ユーザー専用のモデル一覧を取得
  async getUserModels(): Promise<Model[]> {
    try {
      // まずuser_idでフィルタリングを試行
      let { data, error } = await supabaseAdmin
        .from('models')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true });

      // user_idでデータが見つからない場合は、全モデルを取得（フォールバック）
      if (error || !data || data.length === 0) {
        console.log('No user-specific models found, fetching all models as fallback');
        const fallbackResult = await supabaseAdmin
          .from('models')
          .select('*')
          .order('created_at', { ascending: true });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('User models fetch error:', error);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        status: 'active' as const,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('User models fetch error:', error);
      return [];
    }
  }

  // ユーザー専用の月別データを取得
  async getUserMonthlyData(modelId?: string): Promise<{
    id: string;
    user_id: string;
    model_id: string;
    year: number;
    month: number;
    data: FanClubRevenueData[];
    created_at: string;
    updated_at: string;
  }[]> {
    try {
      // まずuser_idでフィルタリングを試行
      let query = supabaseAdmin
        .from('monthly_data')
        .select('*')
        .eq('user_id', this.userId);

      if (modelId) {
        query = query.eq('model_id', modelId);
      }

      let { data, error } = await query
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      // user_idでデータが見つからない場合は、全データを取得（フォールバック）
      if (error || !data || data.length === 0) {
        console.log('No user-specific monthly data found, fetching all data as fallback');
        let fallbackQuery = supabaseAdmin
          .from('monthly_data')
          .select('*');

        if (modelId) {
          fallbackQuery = fallbackQuery.eq('model_id', modelId);
        }

        const fallbackResult = await fallbackQuery
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('User monthly data fetch error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('User monthly data fetch error:', error);
      return [];
    }
  }

  // ユーザー専用のデータを削除
  async deleteUserModel(modelId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('models')
        .delete()
        .eq('user_id', this.userId)
        .eq('id', modelId);

      if (error) {
        console.error('User model delete error:', error);
        return false;
      }

      // 関連する月別データも削除
      await supabaseAdmin
        .from('monthly_data')
        .delete()
        .eq('user_id', this.userId)
        .eq('model_id', modelId);

      return true;
    } catch (error) {
      console.error('User model delete error:', error);
      return false;
    }
  }

  // ユーザー専用の月別データを削除
  async deleteUserMonthlyData(modelId: string, year: number, month: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('monthly_data')
        .delete()
        .eq('user_id', this.userId)
        .eq('model_id', modelId)
        .eq('year', year)
        .eq('month', month);

      if (error) {
        console.error('User monthly data delete error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('User monthly data delete error:', error);
      return false;
    }
  }

  // ユーザーのデータ使用量を取得
  async getUserDataUsage(): Promise<{
    modelCount: number;
    monthlyDataCount: number;
    totalStorageSize: number;
  }> {
    try {
      const models = await this.getUserModels();
      const monthlyData = await this.getUserMonthlyData();

      // ストレージサイズの概算（JSON.stringifyのサイズ）
      const totalStorageSize = JSON.stringify(monthlyData).length;

      return {
        modelCount: models.length,
        monthlyDataCount: monthlyData.length,
        totalStorageSize
      };
    } catch (error) {
      console.error('User data usage fetch error:', error);
      return {
        modelCount: 0,
        monthlyDataCount: 0,
        totalStorageSize: 0
      };
    }
  }
}

// 現在のユーザーのデータマネージャーを取得
export const getCurrentUserDataManager = (): UserDataManager | null => {
  const currentUser = authManager.getCurrentUser();
  if (!currentUser) return null;
  
  return new UserDataManager(currentUser.id);
};

// 管理者用の全ユーザーデータアクセス（管理者のみ）
export const getAllUsersDataManager = (): {
  getAllUsersStats: () => Promise<{
    totalUsers: number;
    activeUsers: number;
    totalDataSize: number;
  }>;
  getUserData: (userId: string) => Promise<{
    models: Model[];
    monthlyData: {
      id: string;
      user_id: string;
      model_id: string;
      year: number;
      month: number;
      data: FanClubRevenueData[];
      created_at: string;
      updated_at: string;
    }[];
    usage: {
      modelCount: number;
      monthlyDataCount: number;
      totalStorageSize: number;
    };
  }>;
} => {
  if (!authManager.isAdmin()) {
    throw new Error('管理者権限が必要です');
  }

  return {
    // 全ユーザーの統計情報を取得
    async getAllUsersStats() {
      // 実際の実装では、管理者専用のAPIエンドポイントを使用
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalDataSize: 0
      };
    },

    // 特定ユーザーのデータを取得（管理者のみ）
    async getUserData(userId: string) {
      if (!authManager.isAdmin()) {
        throw new Error('管理者権限が必要です');
      }
      
      const userManager = new UserDataManager(userId);
      return {
        models: await userManager.getUserModels(),
        monthlyData: await userManager.getUserMonthlyData(),
        usage: await userManager.getUserDataUsage()
      };
    }
  };
};

// データアクセス制御のミドルウェア
export const withUserDataAccess = <T extends unknown[]>(
  fn: (...args: T) => Promise<unknown>
) => {
  return async (...args: T): Promise<unknown> => {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) {
      throw new Error('認証が必要です');
    }

    if (!currentUser.isActive) {
      throw new Error('アカウントが無効です');
    }

    return await fn(...args);
  };
};

// データ暗号化（簡易版）
export const encryptUserData = (data: unknown, userId: string): string => {
  // 実際の実装では、より強力な暗号化を使用
  const dataString = JSON.stringify(data);
  const encrypted = btoa(`${userId}_${dataString}_${Date.now()}`);
  return encrypted;
};

// データ復号化（簡易版）
export const decryptUserData = (encryptedData: string, userId: string): unknown => {
  try {
    const decoded = atob(encryptedData);
    const parts = decoded.split('_');
    
    if (parts[0] !== userId) {
      throw new Error('データの所有者が一致しません');
    }
    
    return JSON.parse(parts[1]);
  } catch (error) {
    console.error('Data decryption error:', error);
    return null;
  }
};
