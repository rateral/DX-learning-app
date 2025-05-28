import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

function CourseItem({ course, isExpanded, onToggle, onAddTask, onToggleTaskCompletion, onEditCourse, onDeleteCourse, onEditTask, onDeleteTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({
    title: ''
  });
  const [showTaskEditForm, setShowTaskEditForm] = useState(false);
  const [editTaskData, setEditTaskData] = useState({
    id: '',
    title: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [localTasks, setLocalTasks] = useState([]);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // コンポーネントがマウントされたときや、編集フォームが開かれたときに
  // 現在のコースデータをフォームにセット
  const openEditForm = () => {
    setEditData({
      title: course.title
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

  // 保存された順序を適用する関数
  const applyTaskOrder = useCallback((savedOrder) => {
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
  }, [course.tasks, course.title]);

  // ローカルストレージからのフォールバック
  const fallbackToLocalStorage = useCallback(() => {
    const savedOrders = JSON.parse(localStorage.getItem('app_task_orders') || '{}');
    const savedOrder = savedOrders[course.id];
    
    if (savedOrder && Array.isArray(savedOrder)) {
      applyTaskOrder(savedOrder);
    } else {
      // 保存された順序がない場合は現在のタスクをそのまま使用
      setLocalTasks([...course.tasks]);
    }
  }, [course.id, course.tasks, applyTaskOrder]);

  // タスク順序を保存するヘルパー関数
  const saveTaskOrder = async (updatedTasks) => {
    // タスクIDの配列を作成
    const taskIds = updatedTasks.map(task => task.id);
    
    // デバッグ用のコード
    console.log('タスク順序保存データ: ', {
      course_id: course.id,
      course_id_type: typeof course.id,
      order_array: taskIds,
      データ型: typeof taskIds,
      配列の長さ: taskIds.length,
      配列の内容: JSON.stringify(taskIds)
    });
    
    try {
      // Supabaseへの直接APIリクエストを試みる（デバッグ用）
      try {
        console.log('Supabaseに直接APIリクエスト（テスト用）を送信します...');
        const response = await fetch(`https://cpueevdrecsauwnifoom.supabase.co/rest/v1/rpc/get_task_order_by_course`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I`,
            'Accept': '*/*',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            p_course_id: course.id
          })
        });
        
        console.log('直接APIリクエスト結果:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers])
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('取得データ:', responseData);
        } else {
          const errorText = await response.text();
          console.error('APIエラー内容:', errorText);
        }
      } catch (apiError) {
        console.error('直接APIリクエストエラー:', apiError);
      }
      
      // タスク順序データを取得して更新または作成
      const { data, error } = await supabase
        .rpc('get_task_order_by_course', {
          p_course_id: course.id
        });
      
      if (error) {
        console.error('タスク順序の取得エラー:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        // 既存の順序を更新
        const { error: updateError } = await supabase
          .from('task_order')
          .update({ 
            order_array: taskIds,
            updated_at: new Date().toISOString() 
          })
          .eq('id', data[0].id);
        
        if (updateError) {
          console.error('タスク順序の更新エラー:', updateError);
          throw updateError;
        }
        
        console.log(`コース「${course.title}」のタスク順序をSupabaseで更新しました`);
      } else {
        // 新しい順序を作成
        console.log('新しいタスク順序レコードを作成します:', {
          course_id: course.id,
          order_array: taskIds
        });
        
        const { error: insertError } = await supabase
          .from('task_order')
          .insert([{ 
            course_id: course.id,
            order_array: taskIds 
          }]);
        
        if (insertError) {
          console.error('タスク順序の作成エラー:', insertError);
          throw insertError;
        }
        
        console.log(`コース「${course.title}」のタスク順序をSupabaseに保存しました`);
      }
    } catch (error) {
      console.error('Supabaseとの同期エラー:', error);
      // エラー時はローカルストレージにフォールバック
      const savedOrders = JSON.parse(localStorage.getItem('app_task_orders') || '{}');
      savedOrders[course.id] = taskIds;
      localStorage.setItem('app_task_orders', JSON.stringify(savedOrders));
      console.log(`コース「${course.title}」のタスク順序をローカルストレージに保存しました（フォールバック）:`, taskIds);
    }
    
    // 念のためローカルストレージにも保存（フォールバック用）
    const savedOrders = JSON.parse(localStorage.getItem('app_task_orders') || '{}');
    savedOrders[course.id] = taskIds;
    localStorage.setItem('app_task_orders', JSON.stringify(savedOrders));
  };

  // 初期表示時にタスク順序を復元
  useEffect(() => {
    if (course.tasks && course.tasks.length > 0) {
      const fetchTaskOrder = async () => {
        try {
          console.log(`コース「${course.title}」(ID: ${course.id})のタスク順序を取得開始...`);
          
          let savedOrder = null;
          
          // Supabaseから順序を取得
          try {
            console.log('Supabaseクライアントで取得を試みます...');
            // タスク順序RPCを使用
            const { data, error } = await supabase
              .rpc('get_task_order_by_course', {
                p_course_id: course.id
              });
            
            if (error) {
              console.error('タスク順序RPC呼び出しエラー:', error);
              throw error;
            }
            
            if (data && data.length > 0) {
              savedOrder = data[0].order_array;
              console.log('Supabase RPCからタスク順序を取得しました:', savedOrder);
            } else {
              console.log('RPCからの取得結果が空です。フォールバック方法を試みます...');
              // 通常のクエリを試みる
              const { data: queryData, error: queryError } = await supabase
                .from('task_order')
                .select('*', {
                  headers: {
                    'Accept': '*/*'
                  }
                })
                .eq('course_id', course.id)
                .single();
              
              if (queryError && queryError.code !== 'PGRST116') {
                console.error('通常クエリでのタスク順序取得エラー:', queryError);
                throw queryError;
              }
              
              if (queryData) {
                savedOrder = queryData.order_array;
                console.log('Supabase通常クエリからタスク順序を取得しました:', savedOrder);
              } else {
                // データが存在しない場合は新しいレコードを作成
                console.log('タスク順序データが存在しません。新しいレコードを作成します:', course.id);
                
                const taskIds = course.tasks.map(task => task.id);
                
                try {
                  const { data: newOrderData, error: createError } = await supabase
                    .from('task_order')
                    .insert([{ 
                      course_id: course.id,
                      order_array: taskIds 
                    }])
                    .select();
                  
                  if (createError) {
                    console.error('タスク順序の作成エラー:', createError);
                    throw createError;
                  }
                  
                  if (newOrderData && newOrderData.length > 0) {
                    savedOrder = newOrderData[0].order_array;
                    console.log('新しいタスク順序レコードを作成しました:', savedOrder);
                  }
                } catch (createOrderError) {
                  console.error('タスク順序レコード作成エラー:', createOrderError);
                  // 作成に失敗した場合もフォールバック
                  fallbackToLocalStorage();
                  return;
                }
              }
            }
          } catch (supabaseError) {
            console.error('Supabaseからの取得エラー:', supabaseError);
            // エラー時はローカルストレージにフォールバック
            fallbackToLocalStorage();
            return;
          }
          
          // 取得した順序を適用
          if (savedOrder && Array.isArray(savedOrder)) {
            applyTaskOrder(savedOrder);
          } else {
            // 保存された順序がない場合は現在のタスクをそのまま使用
            setLocalTasks([...course.tasks]);
          }
        } catch (error) {
          console.error('タスク順序の取得エラー:', error);
          fallbackToLocalStorage();
        }
      };
      
      fetchTaskOrder();
    } else {
      setLocalTasks([]);
    }
  }, [course.id, course.tasks, course.title, applyTaskOrder, fallbackToLocalStorage]);

  // タスク位置変更ハンドラー
  const handleTaskPositionChange = async (currentIndex, newPosition) => {
    // 位置は1から始まるUIに対し、インデックスは0から始まるため調整
    const targetIndex = parseInt(newPosition, 10) - 1;
    
    // 現在位置と同じなら何もしない
    if (currentIndex === targetIndex) {
      return;
    }
    
    // 処理中フラグを設定
    setIsProcessing(true);
    
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
      setIsProcessing(false);
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

  const handleUpdateCourse = async () => {
    if (!editData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    try {
      console.log('コース更新開始:', { courseId: course.id, title: editData.title });
      
      const success = await onUpdateCourse(course.id, {
        title: editData.title.trim(),
        description: course.description || '', // 既存の値を保持
        category: course.category || 'other' // 既存の値を保持
      });
      
      if (success) {
        setShowEditForm(false);
        setEditData({ title: '' });
        console.log('コース更新完了');
      } else {
        alert('コースの更新に失敗しました');
      }
    } catch (error) {
      console.error('コース更新エラー:', error);
      alert('コースの更新中にエラーが発生しました');
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
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCourse();
            }}>
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setShowEditForm(false)}>
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpdateCourse();
                  }}
                  style={{ backgroundColor: '#4caf50', color: 'white' }}
                >
                  更新
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