import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

function UserLogin() {
  const { users, currentUser, login, addUser, deleteUser, reorderUsers, loading, isUsingLocalStorage } = useUser();
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  const handleDeleteUser = async (e, userId, userName) => {
    e.stopPropagation(); // ユーザーカードのクリックイベントを阻止
    
    if (currentUser && currentUser.id === userId) {
      alert('現在ログイン中のユーザーは削除できません。');
      return;
    }
    
    const confirmed = window.confirm(`${userName}を削除しますか？`);
    if (!confirmed) return;
    
    try {
      const result = await deleteUser(userId);
      if (!result.success) {
        throw new Error(result.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      alert(`ユーザーの削除に失敗しました: ${error.message}`);
    }
  };

  // ドラッグ開始
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    // ドラッグ中のスタイルを設定
    e.target.style.opacity = '0.5';
  };

  // ドラッグ終了
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
  };

  // ドラッグオーバー
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ドロップ
  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    console.log('ドラッグ&ドロップ:', {
      from: draggedIndex,
      to: dropIndex,
      sourceUser: users[draggedIndex]?.name,
      targetUser: users[dropIndex]?.name
    });

    // ユーザーの順序を変更（非同期）
    await reorderUsers(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            minHeight: '50px',
            padding: '5px'
          }}>
            {users.map((user, index) => (
              <div
                key={user.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onClick={(e) => {
                  // ドラッグ中でない場合のみログイン処理を実行
                  if (draggedIndex === null && currentUser?.id !== user.id) {
                    login(user.id);
                  }
                }}
                style={{
                  position: 'relative',
                  padding: '8px 12px',
                  backgroundColor: currentUser && currentUser.id === user.id 
                    ? '#e3f2fd' 
                    : draggedIndex === index
                      ? '#ffffff' 
                      : '#f5f5f5',
                  borderRadius: '4px',
                  cursor: draggedIndex === index
                    ? 'grabbing' 
                    : currentUser?.id === user.id 
                      ? 'grab' 
                      : 'pointer',
                  border: currentUser && currentUser.id === user.id 
                    ? '2px solid #3f51b5' 
                    : draggedIndex === index
                      ? '2px solid #2196f3'
                      : '1px solid #ddd',
                  minWidth: '100px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  fontWeight: 'bold',
                  color: currentUser && currentUser.id === user.id ? '#3f51b5' : '#333',
                  boxShadow: draggedIndex === index ? '0 5px 15px rgba(0,0,0,0.3)' : 'none',
                  transform: draggedIndex === index ? 'rotate(2deg)' : 'none',
                  userSelect: 'none'
                }}
              >
                {user.name}
                
                {/* 削除ボタン（現在のユーザーでない場合のみ表示） */}
                {(!currentUser || currentUser.id !== user.id) && (
                  <button
                    onClick={(e) => handleDeleteUser(e, user.id, user.name)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      lineHeight: '1',
                      zIndex: 10
                    }}
                    title="ユーザーを削除"
                  >
                    ❌
                  </button>
                )}
                
                {/* ドラッグハンドル表示（ドラッグ中のみ） */}
                {draggedIndex === index && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    fontSize: '10px',
                    color: '#666',
                    pointerEvents: 'none'
                  }}>
                    ⋮⋮
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 右側のボタンエリア */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '20px' }}>
          {/* 新規ユーザー作成ボタン */}
          <button 
            onClick={() => setShowNewUserForm(true)}
            style={{ 
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            disabled={showNewUserForm || loading}
          >
            新規ユーザー作成
          </button>
        </div>
      </div>

      {/* 使用方法の説明 */}
      <div style={{
        backgroundColor: '#e8f5e8',
        color: '#2e7d32',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '15px',
        fontSize: '0.9em',
        border: '1px solid #c8e6c9'
      }}>
        💡 ユーザー名をドラッグ&ドロップで順序を変更できます
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