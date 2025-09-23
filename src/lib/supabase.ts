import { createClient } from '@supabase/supabase-js'

// Supabaseの設定
// 実際のプロジェクトでは環境変数を使用してください
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// データベースのテーブル型定義
export interface Database {
  public: {
    Tables: {
      models: {
        Row: {
          id: string
          name: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      monthly_data: {
        Row: {
          id: string
          model_id: string
          year: number
          month: number
          data: unknown // JSON形式の取引データ
          analysis: unknown // JSON形式の分析結果
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          model_id: string
          year: number
          month: number
          data: unknown
          analysis: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          year?: number
          month?: number
          data?: unknown
          analysis?: unknown
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
