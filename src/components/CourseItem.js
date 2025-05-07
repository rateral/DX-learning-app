import React, { useState, useEffect } from 'react';

function CourseItem({ course, isExpanded, onToggle, onAddTask, onToggleTaskCompletion, onEditCourse, onDeleteCourse, onEditTask, onDeleteTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    category: ''
  });
  const [showTaskEditForm, setShowTaskEditForm] = useState(false);
  const [editTaskData, setEditTaskData] = useState({
    id: '',
    title: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [localTasks, setLocalTasks] = useState([]);
  const [isReorderingTask, setIsReorderingTask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState(null);

  // コンポーネントがマウントされたときや、編集フォームが開かれたときに
  // 現在のコースデータをフォームにセット
  const openEditForm = () => {
    setEditData({
      title: course.title,
      description: course.description || '',
      category: course.category || 'other'
    });
    setShowEditForm(true);
  };

  // タスク編集フォームを開く
  const openTaskEditForm = (task) => {
    setEditTaskData({
      id: task.id,
      title: task.title
    });
    setShowTaskEditForm(true);
  };

  // タスク順序を保存するヘルパー関数
  const saveTaskOrder = (updatedTasks) => {
    // タスクIDの配列を作成
    const taskIds = updatedTasks.map(task => task.id);
    // ローカルストレージに保存（courseId単位で保存）
    const savedOrders = JSON.parse(localStorage.getItem('app_task_orders') || '{}');
    savedOrders[course.id] = taskIds;
    localStorage.setItem('app_task_orders', JSON.stringify(savedOrders));
    console.log(`コース「${course.title}」のタスク順序を保存しました:`, taskIds);
  };

  // 初期表示時にローカルストレージから順序を復元
  useEffect(() => {
    if (course.tasks && course.tasks.length > 0) {
      const savedOrders = JSON.parse(localStorage.getItem('app_task_orders') || '{}');
      const savedOrder = savedOrders[course.id];
      
      if (savedOrder && Array.isArray(savedOrder)) {
        // 保存された順序と現在のタスクを照合
        const currentTaskIds = course.tasks.map(task => task.id);
        // 順序が有効かチェック（両方に存在するIDのみ）
        const validSavedIds = savedOrder.filter(id => currentTaskIds.includes(id));
        // 保存されていないIDを取得
        const missingIds = currentTaskIds.filter(id => !savedOrder.includes(id));
        
        if (validSavedIds.length > 0) {
          // 有効な順序と新しいタスクを組み合わせて順序を更新
          const orderedTasks = [
            // 保存された順序を維持
            ...validSavedIds.map(id => course.tasks.find(task => task.id === id)),
            // 新しいタスクを末尾に追加
            ...missingIds.map(id => course.tasks.find(task => task.id === id))
          ].filter(Boolean); // nullや undefined を除外
          
          // ローカルのタスク順序を更新
          setLocalTasks(orderedTasks);
          console.log(`コース「${course.title}」のタスク順序を復元しました`);
        } else {
          // 保存された順序が無効な場合は現在のタスクをそのまま使用
          setLocalTasks([...course.tasks]);
        }
      } else {
        // 保存された順序がない場合は現在のタスクをそのまま使用
        setLocalTasks([...course.tasks]);
      }
    } else {
      setLocalTasks([]);
    }
  }, [course.id, course.tasks, course.title]);

  // タスク位置変更ハンドラー
  const handleTaskPositionChange = async (currentIndex, newPosition) => {
    // 位置は1から始まるUIに対し、インデックスは0から始まるため調整
    const targetIndex = parseInt(newPosition, 10) - 1;
    
    // 現在位置と同じなら何もしない
    if (currentIndex === targetIndex) {
      return;
    }
    
    // 処理中フラグを設定
    setIsReorderingTask(true);
    
    try {
      console.log(`タスク移動: ${currentIndex} → ${targetIndex}`);
      
      // 移動元と移動先の詳細情報をログ出力（デバッグ用）
      console.log('移動元タスク:', { 
        index: currentIndex, 
        id: localTasks[currentIndex].id,
        title: localTasks[currentIndex].title 
      });
      
      console.log('移動先位置:', { 
        index: targetIndex, 
        ...(targetIndex < localTasks.length ? {
          id: localTasks[targetIndex].id,
          title: localTasks[targetIndex].title
        } : { info: '配列の末尾' })
      });
      
      // ローカル状態を更新
      const updatedTasks = [...localTasks];
      const [movedTask] = updatedTasks.splice(currentIndex, 1);
      updatedTasks.splice(targetIndex, 0, movedTask);
      
      // ローカル状態を更新
      setLocalTasks(updatedTasks);
      
      // ローカルストレージに保存
      saveTaskOrder(updatedTasks);
      
      console.log('新しいタスク順序:', updatedTasks.map(task => task.title));
      
      // UIの更新を待機
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('タスク移動処理エラー:', error);
    } finally {
      setIsReorderingTask(false);
    }
  };

  // ドラッグ開始ハンドラー
  const handleDragStart = (e, taskId, index) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('taskIndex', index);
    setDraggedTaskId(taskId);
    
    // ドラッグ中のアイテムを半透明に
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  // ドラッグ終了ハンドラー
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTaskId(null);
    setDropTargetTaskId(null);
  };

  // ドラッグオーバーハンドラー
  const handleDragOver = (e, taskId) => {
    e.preventDefault();
    if (taskId !== draggedTaskId) {
      setDropTargetTaskId(taskId);
    }
  };

  // ドロップハンドラー
  const handleDrop = (e, targetTaskId, targetIndex) => {
    e.preventDefault();
    
    const sourceTaskId = e.dataTransfer.getData('taskId');
    const sourceIndex = parseInt(e.dataTransfer.getData('taskIndex'), 10);
    
    if (sourceTaskId !== targetTaskId) {
      handleTaskPositionChange(sourceIndex, targetIndex + 1);
    }
    
    setDraggedTaskId(null);
    setDropTargetTaskId(null);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) return;
    
    try {
      console.log('タスク追加開始:', { courseId: course.id, title: newTaskTitle });
      setIsAddingTask(true);
      
      const result = await onAddTask(course.id, {
        title: newTaskTitle
      });
      
      console.log('タスク追加結果:', result);
      
      if (result) {
        setNewTaskTitle('');
      } else {
        console.error('タスク追加に失敗しました');
        alert('タスクの追加に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('タスク追加エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'タスク追加時に問題が発生しました'}`);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editData.title.trim()) {
      alert('タイトルは必須です。');
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log('コース編集開始:', { courseId: course.id, updates: editData });
      
      const result = await onEditCourse(course.id, editData);
      
      if (result) {
        console.log('コース編集成功:', result);
        setShowEditForm(false);
      } else {
        console.error('コース編集に失敗しました');
        alert('コースの編集に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('コース編集エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'コース編集時に問題が発生しました'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editTaskData.title.trim()) {
      alert('タイトルは必須です。');
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log('タスク編集開始:', { courseId: course.id, taskId: editTaskData.id, updates: editTaskData });
      
      const result = await onEditTask(course.id, editTaskData.id, { title: editTaskData.title });
      
      if (result) {
        console.log('タスク編集成功:', result);
        setShowTaskEditForm(false);
      } else {
        console.error('タスク編集に失敗しました');
        alert('タスクの編集に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('タスク編集エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'タスク編集時に問題が発生しました'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCourse = async (e) => {
    e.stopPropagation(); // クリックイベントの伝播を止める
    
    const confirmDelete = window.confirm(
      `「${course.title}」を削除してもよろしいですか？\nこのコースに関連する全てのタスクと進捗データも削除されます。`
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsProcessing(true);
      console.log('コース削除開始:', { courseId: course.id });
      
      const result = await onDeleteCourse(course.id);
      
      if (!result) {
        console.error('コース削除に失敗しました');
        alert('コースの削除に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('コース削除エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'コース削除時に問題が発生しました'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation(); // クリックイベントの伝播を止める
    
    const task = course.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const confirmDelete = window.confirm(
      `「${task.title}」を削除してもよろしいですか？`
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsProcessing(true);
      console.log('タスク削除開始:', { courseId: course.id, taskId });
      
      const result = await onDeleteTask(course.id, taskId);
      
      if (!result) {
        console.error('タスク削除に失敗しました');
        alert('タスクの削除に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('タスク削除エラー:', error);
      alert(`エラーが発生しました: ${error.message || 'タスク削除時に問題が発生しました'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      programming: 'プログラミング',
      language: '語学',
      math: '数学',
      science: '科学',
      other: 'その他'
    };
    
    return categories[category] || category;
  };

  return (
    <div className="card" style={{ 
      marginBottom: '0',  // 親コンポーネントでマージンを管理するため0に設定
      borderLeft: 'none', // 左ボーダーを削除（ドラッグハンドルがあるため）
      position: 'relative',
      borderRadius: '0 4px 4px 0' // 右側だけ角丸に
    }}>
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: '0' }}>
            {course.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              display: 'inline-block', 
              backgroundColor: '#e0e0e0', 
              padding: '3px 8px', 
              borderRadius: '12px', 
              fontSize: '0.8rem'
            }}>
              {getCategoryLabel(course.category)}
            </span>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{ 
                width: '100px', 
                backgroundColor: '#f0f0f0',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${course.progress}%`, 
                  backgroundColor: course.progress >= 100 ? '#4caf50' : '#4caf50',
                  height: '10px'
                }}></div>
              </div>
              <span>{course.progress}%</span>
            </div>
            
            {/* 編集・削除ボタン */}
            <div style={{ 
              display: 'flex',
              gap: '5px'
            }}>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); // クリックイベントの伝播を止める
                  openEditForm();
                }}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                編集
              </button>
              <button 
                onClick={handleDeleteCourse}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
        {course.description && <p>{course.description}</p>}
      </div>
      
      {isExpanded && (
        <div style={{ marginTop: '15px' }}>
          
          {localTasks && localTasks.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
              {localTasks.map((task, index) => (
                <li 
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: draggedTaskId === task.id ? '#f0f8ff' : 
                                    dropTargetTaskId === task.id ? '#e8f5e9' : 'transparent',
                    opacity: draggedTaskId === task.id ? 0.6 : 1,
                    transform: dropTargetTaskId === task.id ? 'translateY(2px)' : 'none',
                    cursor: 'grab',
                    transition: 'all 0.2s ease'
                  }}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task.id, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => handleDrop(e, task.id, index)}
                >
                  <div style={{
                    marginRight: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '16px',
                    height: '16px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6H20M4 12H20M4 18H20" stroke="#757575" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => {
                      e.stopPropagation(); // クリックイベントの伝播を止める
                      console.log('チェックボックスがクリックされました', { courseId: course.id, taskId: task.id, currentState: task.completed });
                      onToggleTaskCompletion(course.id, task.id);
                    }}
                    style={{ 
                      marginRight: '10px',
                      width: '20px',
                      height: '20px',
                      accentColor: '#4caf50',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ 
                    flex: 1
                  }}>
                    {task.title}
                  </span>
                  
                  {/* タスクの編集・削除ボタン */}
                  <div style={{ 
                    display: 'flex',
                    gap: '5px',
                    marginLeft: 'auto'
                  }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // クリックイベントの伝播を止める
                        openTaskEditForm(task);
                      }}
                      disabled={isProcessing}
                      style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        minWidth: '40px'
                      }}
                    >
                      編集
                    </button>
                    <button 
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      disabled={isProcessing}
                      style={{
                        backgroundColor: '#F44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        minWidth: '40px'
                      }}
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>まだ課題がありません。新しい課題を追加してください。</p>
          )}
          
          <form onSubmit={handleAddTask} style={{ marginTop: '15px', display: 'flex' }}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="新しい課題を追加"
              style={{ flex: 1, marginRight: '10px' }}
              disabled={isAddingTask}
            />
            <button 
              type="submit"
              style={{ backgroundColor: '#4caf50' }}
              disabled={!newTaskTitle.trim() || isAddingTask}
            >
              {isAddingTask ? '追加中...' : '追加'}
            </button>
          </form>
        </div>
      )}

      {/* コース編集モーダル */}
      {showEditForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>コースを編集</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>タイトル *</label>
                <input
                  id="title"
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>説明</label>
                <textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', minHeight: '100px' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="category" style={{ display: 'block', marginBottom: '5px' }}>カテゴリ</label>
                <select
                  id="category"
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="programming">プログラミング</option>
                  <option value="language">語学</option>
                  <option value="math">数学</option>
                  <option value="science">科学</option>
                  <option value="other">その他</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 15px'
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!editData.title.trim() || isProcessing}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 15px'
                  }}
                >
                  {isProcessing ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* タスク編集モーダル */}
      {showTaskEditForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>課題を編集</h3>
            <form onSubmit={handleTaskEditSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="taskTitle" style={{ display: 'block', marginBottom: '5px' }}>タイトル *</label>
                <input
                  id="taskTitle"
                  type="text"
                  value={editTaskData.title}
                  onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setShowTaskEditForm(false)}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 15px'
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!editTaskData.title.trim() || isProcessing}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 15px'
                  }}
                >
                  {isProcessing ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseItem;