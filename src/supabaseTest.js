// 接続情報を共通化
const API_URL = 'https://cpueevdrecsauwnifoom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I';

// 共通ヘッダー
const getHeaders = (contentType = null) => {
  const headers = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`
  };
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
};

// Supabase API接続テスト
export const testSupabaseConnection = async () => {
  try {
    console.log('接続テスト開始...');
    const response = await fetch(`${API_URL}/rest/v1/users?select=count`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };
    
    if (response.ok) {
      const data = await response.json();
      result.data = data;
      console.log('接続テスト成功:', data);
    } else {
      const errorText = await response.text();
      result.error = errorText;
      console.error('接続テストエラー:', errorText);
    }
    
    return result;
  } catch (error) {
    console.error('接続テスト例外:', error);
    return { 
      error: error.message,
      ok: false 
    };
  }
};

// Supabaseにテストユーザーを作成する関数
export const createTestUser = async () => {
  try {
    console.log('テストユーザー作成開始...');
    
    // まず既存のユーザー数をチェック
    const checkResponse = await fetch(`${API_URL}/rest/v1/users?select=count`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('ユーザー数チェックエラー:', errorText);
      return {
        status: checkResponse.status,
        statusText: checkResponse.statusText,
        ok: false,
        error: `ユーザーテーブルへのアクセスエラー: ${errorText}`
      };
    }
    
    const timestamp = new Date().getTime();
    console.log('テストユーザー作成リクエスト送信:', {
      url: `${API_URL}/rest/v1/users`,
      headers: {
        ...getHeaders('application/json'),
        'Prefer': 'return=representation'
      },
      body: {
        name: 'テストユーザー' + timestamp,
        created_at: new Date().toISOString()
      }
    });
    
    const response = await fetch(`${API_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        ...getHeaders('application/json'),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'テストユーザー' + timestamp,
        created_at: new Date().toISOString()
      })
    });
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };
    
    if (response.ok) {
      const data = await response.json();
      result.data = data;
      console.log('テストユーザー作成成功:', data);
    } else {
      const errorText = await response.text();
      console.error('テストユーザー作成エラー詳細:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries([...response.headers])
      });
      result.error = errorText;
    }
    
    return result;
  } catch (error) {
    console.error('テストユーザー作成例外:', error);
    return { 
      error: error.message,
      ok: false 
    };
  }
}; 