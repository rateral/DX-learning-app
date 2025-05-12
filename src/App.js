import React, { useState, useEffect } from 'react';
import CourseList from './components/CourseList';
import AddCourse from './components/AddCourse';
import ProgressChart from './components/ProgressChart';
import Header from './components/Header';
import StudySession from './components/StudySession';
import UserLogin from './components/auth/UserLogin';
import { UserProvider, useUser } from './contexts/UserContext';
import { SharedDataProvider, useSharedData } from './contexts/SharedDataContext';
import { PersonalDataProvider, usePersonalData } from './contexts/PersonalDataContext';
import { supabase } from './supabase';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

function Main() {
  const { currentUser } = useUser();
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const { 
    addCourse, 
    addTask,
    updateCourse,
    deleteCourse,
    updateTask,
    deleteTask,
    toggleUserTaskCompletion,
    isTaskCompletedByUser,
    getUserProgress,
    getAverageProgress,
    getCoursesWithTasks,
    reorderCourses,
    fetchCoursesAndTasks
  } = useSharedData();
  
  const {
    studySessions,
    addStudySession,
    loading: sessionsLoading
  } = usePersonalData();

  // 初回ロード時に必ずデータを取得
  useEffect(() => {
    fetchCoursesAndTasks();
  }, []);

  // コース追加後に再読み込み
  const handleAddCourse = async (courseData) => {
    const result = await addCourse(courseData);
    if (result) {
      // コースが追加されたら、コースとタスクを再取得
      fetchCoursesAndTasks();
    }
    return result;
  };

  // コース編集ハンドラー
  const handleEditCourse = async (courseId, updates) => {
    const result = await updateCourse(courseId, updates);
    if (result) {
      // UIの強制更新
      setUpdateTrigger(prev => prev + 1);
    }
    return result;
  };

  // コース削除ハンドラー
  const handleDeleteCourse = async (courseId) => {
    const result = await deleteCourse(courseId);
    if (result) {
      // UIの強制更新
      setUpdateTrigger(prev => prev + 1);
    }
    return result;
  };

  // タスク完了切り替えハンドラー
  const handleTaskToggle = async (courseId, taskId) => {
    await toggleUserTaskCompletion(
      currentUser ? currentUser.id : 'guest',
      courseId,
      taskId
    );
    // UIの強制更新
    setUpdateTrigger(prev => prev + 1);
  };

  // タスク編集ハンドラー
  const handleEditTask = async (courseId, taskId, updates) => {
    const result = await updateTask(courseId, taskId, updates);
    if (result) {
      // UIの強制更新
      setUpdateTrigger(prev => prev + 1);
    }
    return result;
  };

  // タスク削除ハンドラー
  const handleDeleteTask = async (courseId, taskId) => {
    const result = await deleteTask(courseId, taskId);
    if (result) {
      // UIの強制更新
      setUpdateTrigger(prev => prev + 1);
    }
    return result;
  };

  // コース順序変更ハンドラー
  const handleReorderCourses = async (startIndex, endIndex) => {
    console.log('App: コース順序変更開始', { 
      startIndex, 
      endIndex, 
      startIndexType: typeof startIndex, 
      endIndexType: typeof endIndex,
      coursesLength: courses.length
    });
    
    try {
      // 入力値を数値に変換
      const numStartIndex = Number(startIndex);
      const numEndIndex = Number(endIndex);
      
      if (isNaN(numStartIndex) || isNaN(numEndIndex)) {
        console.error('App: インデックスが数値ではありません', { startIndex, endIndex });
        return false;
      }
      
      // バリデーションチェック
      if (numStartIndex < 0 || numStartIndex >= courses.length || 
          numEndIndex < 0 || numEndIndex >= courses.length) {
        console.error('App: インデックスが範囲外です', { 
          numStartIndex, 
          numEndIndex,
          coursesLength: courses.length
        });
        return false;
      }
      
      // コース情報を確認
      console.log('App: 移動するコース情報', {
        sourceItem: courses[numStartIndex]?.title || '不明',
        targetItem: courses[numEndIndex]?.title || '不明'
      });
      
      // 移動前のコース一覧をログ出力
      console.log('App: 移動前のコース一覧:',
        courses.map((course, idx) => `${idx}: ${course.title}`)
      );
      
      // コース順序変更を実行
      const result = await reorderCourses(numStartIndex, numEndIndex);
      
      if (result) {
        console.log('App: コース順序変更成功、データを再取得します');
        
        // 少し待機してから再取得（Supabaseの更新を待つ）
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 順序変更後はコースデータを再取得
        await fetchCoursesAndTasks();
        
        // 移動後のコース一覧をログ出力
        console.log('App: 移動後のコース一覧:',
          getCoursesWithTasks().map((course, idx) => `${idx}: ${course.title}`)
        );
        
        // UIの強制更新（状態更新を行って確実に再レンダリングを促す）
        setUpdateTrigger(prev => prev + 1);
        
        // 遅延更新を設定して画面が確実に更新されるようにする
        setTimeout(() => {
          console.log('App: 遅延更新を実行します');
          setUpdateTrigger(prev => prev + 1);
          
          // コース一覧ログ出力
          console.log('App: 遅延更新後のコース一覧:',
            getCoursesWithTasks().map((course, idx) => `${idx}: ${course.title}`)
          );
          
          // 更に少し待機してもう一度更新
          setTimeout(() => {
            console.log('App: 2回目の遅延更新を実行します');
            setUpdateTrigger(prev => prev + 1);
            
            // 最終確認用のコース一覧ログ出力
            console.log('App: 最終的なコース一覧:',
              getCoursesWithTasks().map((course, idx) => `${idx}: ${course.title}`)
            );
          }, 300);
        }, 300);
        
        return true;
      } else {
        console.error('App: コース順序変更に失敗しました');
        return false;
      }
    } catch (error) {
      console.error('App: コース順序変更中にエラーが発生しました', error);
      return false;
    }
  };

  // コース一覧表示用のデータを取得
  const courses = getCoursesWithTasks();
  
  // 表示データに進捗状況を追加（現在のユーザーのみの表示）
  const coursesWithProgress = React.useMemo(() => {
    console.log('コースデータを再計算します', { updateTrigger });
    return courses.map(course => {
      // 現在のユーザーの進捗率を取得
      const progress = getUserProgress(currentUser ? currentUser.id : 'guest', course.id);
      
      // ユーザー別のタスク完了状態を反映
      const tasksWithCompletion = course.tasks.map(task => ({
        ...task,
        completed: isTaskCompletedByUser(currentUser ? currentUser.id : 'guest', course.id, task.id)
      }));
      
      return {
        ...course,
        progress,
        tasks: tasksWithCompletion
      };
    });
  }, [courses, currentUser, getUserProgress, isTaskCompletedByUser, updateTrigger]);

  return (
    <div>
      <Header />
      <div className="container">
        <div className="card" style={{ marginBottom: '20px' }}>
          <UserLogin />
        </div>
        
        <div className="card">
          <h2>学習進捗チャート</h2>
          <ProgressChart 
            key={`chart-${currentUser ? currentUser.id : 'guest'}`} 
            courses={coursesWithProgress} 
            studySessions={studySessions} 
          />
        </div>
        
        <div className="card">
          <h2>コース一覧</h2>
          <CourseList 
            key={`list-${currentUser ? currentUser.id : 'guest'}`}
            courses={coursesWithProgress} 
            onAddTask={addTask} 
            onToggleTaskCompletion={handleTaskToggle} 
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onReorderCourses={handleReorderCourses}
          />
        </div>

        <div className="grid" style={{ marginTop: '20px' }}>
          <div className="card">
            <h2>コース追加</h2>
            <AddCourse onAddCourse={handleAddCourse} />
          </div>
          <div className="card">
            <h2>学習記録 <span style={{ fontSize: '0.8rem', color: '#4caf50' }}>(個人データ)</span></h2>
            <StudySession 
              courses={courses.map(c => ({ id: c.id, title: c.title }))} 
              onAddStudySession={addStudySession} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthGuardedApp() {
  const [session, setSession] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    // 初回にセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // 状態変化のリスナー
    const { data: listener } = supabase.auth.onAuthStateChange((_event, payload = {}) => {
      setSession(payload.session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!session) {
    return showSignup
      ? <Signup onSignup={() => setShowSignup(false)} onSwitch={() => setShowSignup(false)} />
      : <Login onLogin={() => {
          supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        }} onSwitch={() => setShowSignup(true)} />;
  }

  // 認証済みなら本体を表示
  return <Main />;
}

export default AuthGuardedApp;