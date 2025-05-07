import { createClient } from '@supabase/supabase-js';

// Supabaseの接続情報
const supabaseUrl = 'https://cpueevdrecsauwnifoom.supabase.co';

// APIキーを設定
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I';

// Supabaseクライアントを作成
let supabase;

try {
  // クライアント設定オプション
  const options = {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true, // セッションを保持するように設定
    },
    realtime: {
      enabled: false, // リアルタイム機能を無効化
    },
    global: {
      headers: {
        'x-application-name': 'learning-progress-app',
        'Content-Type': 'application/json',
        'Accept': '*/*', // より広いAcceptヘッダーを設定
      },
    },
    // 固定オプションを追加
    postgrest: {
      headers: {
        'Accept': '*/*',
      }
    }
  };
  
  // クライアント初期化
  supabase = createClient(supabaseUrl, supabaseAnonKey, options);
  supabase.supabaseKey = supabaseAnonKey;
} catch (error) {
  console.error('Supabaseクライアント作成エラー:', error);
  // フォールバック - シンプルな方法
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabase.supabaseKey = supabaseAnonKey;
}

export { supabase }; 