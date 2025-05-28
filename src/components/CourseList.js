import React, { useState, useEffect, useRef } from 'react';
import CourseItem from './CourseItem';

function CourseList({ courses, onAddTask, onToggleTaskCompletion, onEditCourse, onDeleteCourse, onEditTask, onDeleteTask, onReorderCourses }) {
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [localCourses, setLocalCourses] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMovedIndex, setLastMovedIndex] = useState(null);
  const hasInitiallyRendered = useRef(false);
  
  // coursesが変更されたらlocalCoursesを更新
  useEffect(() => {
    console.log('CourseList: コース一覧を更新', courses.map(c => c.title));
    
    // 配列が変更されたことを確実に検知するために、新しい配列インスタンスを生成
    const newCourses = [...courses];
    setLocalCourses(newCourses); // 配列を直接設定（順序を維持）
    
    // 初回レンダリング以外で処理中状態を解除
    if (hasInitiallyRendered.current) {
      console.log('CourseList: 処理中状態を解除');
      setIsProcessing(false);
    } else {
      hasInitiallyRendered.current = true;
    }
  }, [courses]);
  
  // 処理中状態が変わったときのエフェクト
  useEffect(() => {
    if (!isProcessing) {
      // 処理完了したら移動先のハイライトをクリア
      const timer = setTimeout(() => {
        setLastMovedIndex(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);
  
  // コースの開閉操作
  const toggleCourse = (courseId) => {
    setExpandedCourseId(expandedCourseId === courseId ? null : courseId);
  };
  
  // 上へ移動
  const handleMoveUp = async (index) => {
    if (index <= 0 || isProcessing) return; // 先頭の場合や処理中は何もしない
    
    console.log(`上へ移動ボタンがクリックされました: インデックス=${index}、コース名=${localCourses[index]?.title}`);
    setIsProcessing(true);
    try {
      console.log(`コースを上へ移動: ${index} → ${index - 1}、移動するコース=${localCourses[index]?.title}、移動先=${localCourses[index - 1]?.title}`);
      const result = await onReorderCourses(index, index - 1);
      if (result) {
        // 移動先のインデックスを記録（ハイライト表示用）
        setLastMovedIndex(index - 1);
        console.log(`移動成功：コース「${localCourses[index]?.title}」を上に移動しました`);
      } else {
        console.error(`移動失敗：コース「${localCourses[index]?.title}」の移動に失敗しました`);
        setIsProcessing(false);
      }
      // 処理完了後に少し待機（UI更新を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('移動エラー:', error);
      setIsProcessing(false);
    }
    // 注: setIsProcessing(false)はuseEffect内で行う
  };
  
  // 下へ移動
  const handleMoveDown = async (index) => {
    if (index >= localCourses.length - 1 || isProcessing) return; // 末尾の場合や処理中は何もしない
    
    console.log(`下へ移動ボタンがクリックされました: インデックス=${index}、コース名=${localCourses[index]?.title}`);
    setIsProcessing(true);
    try {
      console.log(`コースを下へ移動: ${index} → ${index + 1}、移動するコース=${localCourses[index]?.title}、移動先=${localCourses[index + 1]?.title}`);
      const result = await onReorderCourses(index, index + 1);
      if (result) {
        // 移動先のインデックスを記録（ハイライト表示用）
        setLastMovedIndex(index + 1);
        console.log(`移動成功：コース「${localCourses[index]?.title}」を下に移動しました`);
      } else {
        console.error(`移動失敗：コース「${localCourses[index]?.title}」の移動に失敗しました`);
        setIsProcessing(false);
      }
      // 処理完了後に少し待機（UI更新を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('移動エラー:', error);
      setIsProcessing(false);
    }
    // 注: setIsProcessing(false)はuseEffect内で行う
  };

  // コースがない場合のメッセージ
  if (localCourses.length === 0) {
    return (
      <div>
        <p>コースがまだ登録されていません。新しいコースを追加してください。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="courses-container" style={{ position: 'relative' }}>
        {localCourses.map((course, index) => (
          <div
            key={course.id}
            className="course-item"
            style={{
              marginBottom: '16px',
              position: 'relative',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              opacity: isProcessing ? 0.7 : 1,
              transform: lastMovedIndex === index ? 'scale(1.02)' : 'scale(1)',
              boxShadow: lastMovedIndex === index 
                ? '0 4px 8px rgba(76, 175, 80, 0.3)' 
                : 'none',
              backgroundColor: lastMovedIndex === index 
                ? 'rgba(76, 175, 80, 0.05)' 
                : 'transparent'
            }}
            data-course-id={course.id}
            data-index={index}
          >
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div
                style={{
                  width: '28px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px 0 0 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRight: '1px solid #e0e0e0',
                  flexShrink: 0
                }}
              >
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || isProcessing}
                  style={{
                    width: '100%',
                    height: '28px',
                    border: 'none',
                    backgroundColor: index === 0 ? '#f0f0f0' : '#e8f5e9',
                    color: index === 0 ? '#bdbdbd' : '#4caf50',
                    cursor: index === 0 || isProcessing ? 'default' : 'pointer',
                    padding: '4px 0',
                    borderRadius: '4px 0 0 0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  title="上に移動"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5L5 12H19L12 5Z" fill={index === 0 ? '#bdbdbd' : '#4caf50'} />
                  </svg>
                </button>

                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === localCourses.length - 1 || isProcessing}
                  style={{
                    width: '100%',
                    height: '28px',
                    border: 'none',
                    backgroundColor: index === localCourses.length - 1 ? '#f0f0f0' : '#e8f5e9',
                    color: index === localCourses.length - 1 ? '#bdbdbd' : '#4caf50',
                    cursor: index === localCourses.length - 1 || isProcessing ? 'default' : 'pointer',
                    padding: '4px 0',
                    borderRadius: '0 0 0 4px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  title="下に移動"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19L5 12H19L12 19Z" fill={index === localCourses.length - 1 ? '#bdbdbd' : '#4caf50'} />
                  </svg>
                </button>
              </div>
              <div style={{ flex: 1 }}>
                <CourseItem
                  course={course}
                  isExpanded={expandedCourseId === course.id}
                  onToggle={() => toggleCourse(course.id)}
                  onAddTask={onAddTask}
                  onToggleTaskCompletion={onToggleTaskCompletion}
                  onEditCourse={onEditCourse}
                  onDeleteCourse={onDeleteCourse}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CourseList;