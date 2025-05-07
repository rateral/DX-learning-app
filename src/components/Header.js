import React from 'react';
import { useUser } from '../contexts/UserContext';

function Header() {
  const { currentUser } = useUser();
  
  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <h1>学習進捗管理アプリ</h1>
        {currentUser && (
          <div style={{ 
            color: 'white', 
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {currentUser.name}
          </div>
        )}
      </div>
      <nav className="nav">
        <a href="#users">ユーザー</a>
        <a href="#courses">コース</a>
        <a href="#progress">進捗</a>
        <a href="#study">学習記録</a>
      </nav>
    </header>
  );
}

export default Header;