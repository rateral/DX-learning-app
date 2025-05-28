import React from 'react';
import { useUser } from '../contexts/UserContext';

function Header() {
  const { currentUser, logout } = useUser();
  
  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <h1>学習進捗管理アプリ</h1>
        {currentUser && (
          <button 
            onClick={logout}
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