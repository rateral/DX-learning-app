import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import UserList from './UserList';

function UserLogin() {
  const { users, currentUser, login, logout, addUser, loading, isUsingLocalStorage } = useUser();
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!newUserName.trim()) return;
    
    try {
      setIsCreatingUser(true);
      console.log('ユーザー作成を開始します:', { name: newUserName });

      const newUser = await addUser({
        name: newUserName,
        email: null  // メールアドレスをnullに設定
      });
      
      console.log('addUser結果:', newUser);
      
      if (newUser) {
        console.log('ログイン処理開始:', newUser.id);
        const loginResult = await login(newUser.id);
        console.log('ログイン結果:', loginResult);
        
        setNewUserName('');
        setShowNewUserForm(false);
      } else {
        console.error('ユーザー作成失敗: newUserがnull');
        alert('ユーザーの作成に失敗しました。システム管理者に連絡してください。');
      }
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'ユーザー作成時に問題が発生しました'}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* 既存ユーザー一覧 */}
            {users.map(user => (
              <div 
                key={user.id} 
                onClick={() => currentUser?.id !== user.id && login(user.id)}
                style={{ 
                  padding: '8px 12px',
                  backgroundColor: currentUser && currentUser.id === user.id ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '4px',
                  cursor: currentUser?.id === user.id ? 'default' : 'pointer',
                  border: currentUser && currentUser.id === user.id ? '2px solid #3f51b5' : '1px solid #ddd',
                  minWidth: '100px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  fontWeight: 'bold',
                  color: currentUser && currentUser.id === user.id ? '#3f51b5' : '#333'
                }}
              >
                {user.name}
              </div>
            ))}
            
            {/* 新規ユーザー作成ボタン */}
            <button 
              onClick={() => setShowNewUserForm(true)}
              style={{ 
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer'
              }}
              disabled={showNewUserForm || loading}
            >
              新規ユーザー作成
            </button>
          </div>
          
          {/* ログアウトボタン（ログイン中のみ表示） */}
          {currentUser && (
            <button 
              onClick={logout} 
              style={{ 
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          )}
        </div>
      </div>

      {/* 動作モード表示 */}
      {isUsingLocalStorage && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          color: '#856404', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          border: '1px solid #ffeeba'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            <span role="img" aria-label="警告">⚠️</span> データベース接続なしで動作中 (ローカルストレージ使用)
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
            現在、データはこのブラウザにのみ保存されています。
          </p>
        </div>
      )}

      {showNewUserForm && (
        <div className="new-user-form" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h3>新規ユーザー登録</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="new-username">ユーザー名</label>
              <input
                id="new-username"
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
              <button 
                type="submit" 
                disabled={!newUserName.trim() || isCreatingUser}
              >
                {isCreatingUser ? "作成中..." : "ユーザーを作成"}
              </button>
              <button 
                type="button" 
                onClick={() => setShowNewUserForm(false)}
                style={{ 
                  backgroundColor: '#f44336',
                }}
                disabled={isCreatingUser}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>ユーザーデータを読み込み中...</p>
        </div>
      )}
    </div>
  );
}

export default UserLogin;