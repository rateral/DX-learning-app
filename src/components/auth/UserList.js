import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

function UserList() {
  const { users, currentUser, login, loading, deleteUser } = useUser();
  const [processingLogin, setProcessingLogin] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogin = async (userId) => {
    if (currentUser?.id === userId || processingLogin) return;
    
    try {
      setProcessingLogin(true);
      setProcessingId(userId);
      await login(userId);
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました。');
    } finally {
      setProcessingLogin(false);
      setProcessingId(null);
    }
  };

  const handleDelete = async (e, userId) => {
    e.stopPropagation(); // カードのクリックイベントが発火しないようにする
    
    if (isDeleting || currentUser?.id === userId) return;
    
    const confirmDelete = window.confirm('このユーザーを削除してもよろしいですか？');
    if (!confirmDelete) return;
    
    try {
      setIsDeleting(true);
      setDeletingId(userId);
      
      const result = await deleteUser(userId);
      
      if (!result.success) {
        throw new Error(result.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      alert(`ユーザーの削除に失敗しました: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="user-list loading">
        <p>ユーザーを読み込み中...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="user-list empty">
        <p>まだユーザーが登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="user-list">
      <h3>登録ユーザー一覧</h3>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        marginTop: '10px' 
      }}>
        {users.map(user => (
          <div 
            key={user.id} 
            onClick={() => handleLogin(user.id)}
            style={{ 
              padding: '8px 12px',
              backgroundColor: currentUser && currentUser.id === user.id ? '#e3f2fd' : '#f5f5f5',
              borderRadius: '4px',
              cursor: (processingLogin && processingId === user.id) || 
                     (isDeleting && deletingId === user.id) ? 'wait' : 'pointer',
              border: currentUser && currentUser.id === user.id ? '2px solid #3f51b5' : '1px solid #ddd',
              minWidth: '100px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              opacity: (processingLogin && processingId !== user.id) || 
                      (isDeleting && deletingId !== user.id) ? 0.6 : 1,
              position: 'relative'
            }}
          >
            <div style={{ 
              fontWeight: 'bold',
              color: currentUser && currentUser.id === user.id ? '#3f51b5' : '#333'
            }}>
              {user.name}
              {processingLogin && processingId === user.id && ' (ログイン中...)'}
              {isDeleting && deletingId === user.id && ' (削除中...)'}
            </div>
            {user.email && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#666', 
                marginTop: '3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px'
              }}>
                {user.email}
              </div>
            )}
            
            {/* 削除ボタン - 現在のユーザーでない場合のみ表示 */}
            {currentUser && currentUser.id !== user.id && (
              <button
                onClick={(e) => handleDelete(e, user.id)}
                disabled={isDeleting}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserList;