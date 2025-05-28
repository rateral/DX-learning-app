import React from 'react';
import { useUser } from '../contexts/UserContext';

function Header() {
  const { currentUser } = useUser();
  
  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <h1>学習進捗管理アプリ</h1>
      </div>
      {/* ナビゲーションメニューを削除 */}
    </header>
  );
}

export default Header;