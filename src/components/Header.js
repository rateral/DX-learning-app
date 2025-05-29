import React from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../supabase';

function Header() {
  const { currentUser, logout } = useUser();
  
  const handleLogout = async () => {
    try {
      // アプリレベルのログアウト
      logout();
      
      // Supabase認証からもログアウト
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabaseログアウトエラー:', error);
        // エラーがあってもアプリレベルのログアウトは実行されているので、続行
      }
      
      // ページをリロードして認証画面に戻る
      window.location.reload();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // エラーがあってもアプリレベルのログアウトは実行されているので、リロード
      window.location.reload();
    }
  };
  
  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', position: 'relative' }}>
        <div style={{ width: currentUser ? '120px' : '0' }}></div>
        <h1 style={{ 
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          margin: '0',
          textAlign: 'center'
        }}>
          DX学習進捗管理アプリ
        </h1>
        {currentUser && (
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#616161';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#757575';
            }}
          >
            ログアウト
          </button>
        )}
      </div>
      {/* ナビゲーションメニューを削除 */}
    </header>
  );
}

export default Header;