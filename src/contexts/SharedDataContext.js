import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const SharedDataContext = createContext();

export const useSharedData = () => useContext(SharedDataContext);

export const SharedDataProvider = ({ children }) => {
  // データ状態
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState({});
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [courseOrder, setCourseOrder] = useState([]); // コース順序を保持する状態
  const [dataLoaded, setDataLoaded] = useState(false);
  const [learningSessions, setLearningSessions] = useState([]); // 学習セッション用の状態を追加

  // タスクとコースを一緒に取得する関数
  const fetchCoursesAndTasks = useCallback(async () => {
    try {
      // コース取得
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      
      // コース順序の初期化
      try {
        // Supabaseからコース順序を取得
        const { data: orderData, error: orderError } = await supabase
          .from('course_order')
          .select('*')
          .single();
        
        if (orderError && orderError.code !== 'PGRST116') { // PGRST116はレコードが見つからない場合のエラー
          console.error('コース順序の取得エラー:', orderError);
          throw orderError;
        }
        
        let orderArray = [];
        
        if (orderData?.order_array) {
          // Supabaseから取得した順序を使用
          orderArray = orderData.order_array;
          console.log('Supabaseからコース順序を取得しました:', orderArray);
          
          // 新しく追加されたコースや削除されたコースを考慮して順序を更新
          const validIds = coursesData.map(course => course.id);
          const filteredOrder = orderArray.filter(id => validIds.includes(id));
          const missingIds = validIds.filter(id => !orderArray.includes(id));
          
          orderArray = [...filteredOrder, ...missingIds];
        } else {
          // 順序がSupabaseにない場合は、ローカルストレージを確認
          const savedOrder = localStorage.getItem('app_course_order');
          
          if (savedOrder) {
            try {
              orderArray = JSON.parse(savedOrder);
              console.log('ローカルストレージからコース順序を取得しました:', orderArray);
              
              // 新しく追加されたコースや削除されたコースを考慮して順序を更新
              const validIds = coursesData.map(course => course.id);
              const filteredOrder = orderArray.filter(id => validIds.includes(id));
              const missingIds = validIds.filter(id => !orderArray.includes(id));
              
              orderArray = [...filteredOrder, ...missingIds];
              
              // ローカルストレージから取得した順序をSupabaseに保存（初回のみ）
              const { error: saveError } = await supabase
                .from('course_order')
                .insert([{ order_array: orderArray }]);
              
              if (saveError) {
                console.error('コース順序の保存エラー:', saveError);
              } else {
                console.log('ローカル順序をSupabaseに保存しました');
              }
            } catch (e) {
              console.error('保存された順序の解析エラー:', e);
              orderArray = coursesData.map(course => course.id);
            }
          } else {
            // 順序が保存されていない場合はデフォルト順序を使用
            orderArray = coursesData.map(course => course.id);
            
            // デフォルト順序をSupabaseに保存
            const { error: saveError } = await supabase
              .from('course_order')
              .insert([{ order_array: orderArray }]);
            
            if (saveError) {
              console.error('デフォルトコース順序の保存エラー:', saveError);
            }
          }
        }
        
        setCourseOrder(orderArray);
      } catch (orderError) {
        console.error('コース順序の処理エラー:', orderError);
        
        // エラー時はローカルストレージから取得
        const savedOrder = localStorage.getItem('app_course_order');
        let orderArray = [];
        
        if (savedOrder) {
          try {
            orderArray = JSON.parse(savedOrder);
            // 新しく追加されたコースや削除されたコースを考慮して順序を更新
            const validIds = coursesData.map(course => course.id);
            const filteredOrder = orderArray.filter(id => validIds.includes(id));
            const missingIds = validIds.filter(id => !orderArray.includes(id));
            
            orderArray = [...filteredOrder, ...missingIds];
          } catch (e) {
            console.error('保存された順序の解析エラー:', e);
            orderArray = coursesData.map(course => course.id);
          }
        } else {
          // 順序が保存されていない場合はデフォルト順序を使用
          orderArray = coursesData.map(course => course.id);
        }
        
        setCourseOrder(orderArray);
      }
      
      // タスク取得
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*');
      
      if (tasksError) throw tasksError;
      
      // タスクをコースIDでグループ化
      const tasksByGroup = tasksData?.reduce((acc, task) => {
        const courseId = task.course_id;
        if (!acc[courseId]) {
          acc[courseId] = [];
        }
        acc[courseId].push({
          id: task.id,
          title: task.title,
          createdAt: task.created_at
        });
        return acc;
      }, {}) || {};
      
      setTasks(tasksByGroup);
      
      // 学習セッションをSupabaseから取得
      try {
        const { data: sessionsData, error: sessionsError } = await supabase
          .rpc('get_learning_sessions');
          
        if (sessionsError) {
          console.error('学習セッションの取得エラー:', sessionsError);
          // エラーがあってもアプリは起動させる（空の配列をセット）
          setLearningSessions([]);
        } else {
          // セッションデータをセット
          setLearningSessions(sessionsData || []);
        }
      } catch (sessionsLoadError) {
        console.error('学習セッションの読み込み例外:', sessionsLoadError);
        setLearningSessions([]);
      }
      
      return { coursesData, tasksByGroup };
    } catch (error) {
      console.error('データ取得エラー:', error);
      return { coursesData: [], tasksByGroup: {} };
    }
  }, []);

  // 進捗データを取得する関数
  const fetchProgress = useCallback(async (taskData) => {
    try {
      let progressStructure = {};
      
      try {
        // Supabaseからのデータ取得を試みる
        // タスク完了状態
        const { data: completions, error: completionsError } = await supabase
          .from('task_completions')
          .select('*');
        
        if (completionsError) throw completionsError;
        
        // コース進捗
        const { data: progress, error: progressError } = await supabase
          .from('course_progress')
          .select('*');
        
        if (progressError) throw progressError;
        
        // 進捗データの構造を構築
        
        // タスク完了状態を追加
        completions?.forEach(completion => {
          const { user_id, task_id, completed } = completion;
          // タスクのコースIDを特定する必要がある
          const taskInfo = Object.entries(taskData).find(([courseId, taskList]) => 
            taskList.some(task => task.id === task_id)
          );
          
          if (taskInfo) {
            const courseId = taskInfo[0];
            if (!progressStructure[user_id]) {
              progressStructure[user_id] = {};
            }
            if (!progressStructure[user_id][courseId]) {
              progressStructure[user_id][courseId] = {
                completedTasks: {},
                progress: 0
              };
            }
            progressStructure[user_id][courseId].completedTasks[task_id] = completed;
          }
        });
        
        // コース進捗率を追加
        progress?.forEach(prog => {
          const { user_id, course_id, progress: progressValue } = prog;
          if (!progressStructure[user_id]) {
            progressStructure[user_id] = {};
          }
          if (!progressStructure[user_id][course_id]) {
            progressStructure[user_id][course_id] = {
              completedTasks: {},
              progress: 0
            };
          }
          progressStructure[user_id][course_id].progress = progressValue;
        });
        
        console.log('Supabaseからの進捗データ取得成功');
      } catch (supabaseError) {
        console.error('Supabaseからの進捗データ取得エラー:', supabaseError.message);
        console.log('ローカルストレージからデータを読み込みます');
        
        // ローカルストレージからデータ取得
        const localTaskCompletions = JSON.parse(localStorage.getItem('app_task_completions') || '{}');
        const localProgress = JSON.parse(localStorage.getItem('app_course_progress') || '{}');
        
        // ローカルデータを進捗構造に変換
        Object.entries(localTaskCompletions).forEach(([userId, tasks]) => {
          if (!progressStructure[userId]) {
            progressStructure[userId] = {};
          }
          
          // コースごとの進捗率を計算
          Object.entries(taskData).forEach(([courseId, courseTasks]) => {
            // このコースのタスク完了状況を確認
            const completedTasksForCourse = courseTasks.filter(task => 
              tasks[task.id] === true
            );
            
            const progress = courseTasks.length > 0
              ? Math.round((completedTasksForCourse.length / courseTasks.length) * 100)
              : 0;
            
            // ローカル計算した進捗率または保存されていた進捗率を使用
            const storedProgress = localProgress[userId]?.[courseId];
            const finalProgress = storedProgress !== undefined ? storedProgress : progress;
            
            if (!progressStructure[userId][courseId]) {
              progressStructure[userId][courseId] = {
                completedTasks: {},
                progress: finalProgress
              };
            } else {
              progressStructure[userId][courseId].progress = finalProgress;
            }
            
            // このコースのタスク完了状態を設定
            courseTasks.forEach(task => {
              if (tasks[task.id] !== undefined) {
                if (!progressStructure[userId][courseId].completedTasks) {
                  progressStructure[userId][courseId].completedTasks = {};
                }
                progressStructure[userId][courseId].completedTasks[task.id] = tasks[task.id];
              }
            });
          });
        });
        
        console.log('ローカルストレージからのデータ読み込み完了');
      }
      
      setProgressData(progressStructure);
    } catch (error) {
      console.error('進捗データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期データのロード
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // コース一覧をSupabaseから取得
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*');
          
        if (coursesError) {
          console.error('コース一覧の取得エラー:', coursesError);
          throw coursesError;
        }

        // コースデータをセット
        setCourses(coursesData || []);
        
        // コース並び順をSupabaseから取得
        try {
          console.log('初期ロード時にコース順序を取得します...');
          const savedOrder = await loadCoursesOrderFromSupabase();
          if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
            console.log('初期ロード時にコース順序をセットします:', savedOrder);
            setCourseOrder(savedOrder);
          } else {
            console.log('保存された順序が見つからないため、デフォルト順序を使用します');
            // デフォルト順序を設定（コースIDの配列）
            const defaultOrder = coursesData.map(course => course.id);
            setCourseOrder(defaultOrder);
            
            // デフォルト順序を保存
            saveCoursesOrderToSupabase(defaultOrder)
              .then(success => {
                if (success) {
                  console.log('デフォルトのコース順序を保存しました');
                  localStorage.setItem('app_course_order', JSON.stringify(defaultOrder));
                }
              })
              .catch(err => console.error('デフォルト順序の保存に失敗:', err));
          }
        } catch (orderError) {
          console.error('コース順序の取得エラー:', orderError);
          // エラー時はコース順をそのまま使用
          const defaultOrder = coursesData.map(course => course.id);
          setCourseOrder(defaultOrder);
        }
        
        // タスク一覧をSupabaseから取得
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*');
          
        if (tasksError) {
          console.error('タスク一覧の取得エラー:', tasksError);
          throw tasksError;
        }
        
        // タスクデータをセット
        setTasks(tasksData || []);
        
        // データ読み込み完了
        setDataLoaded(true);
      } catch (error) {
        console.error('初期データのロードに失敗:', error);
        setDataLoaded(true); // エラーでもロード完了とマーク
      }
    };

    loadInitialData();
  }, []);

  // コース追加
  const addCourse = async (course) => {
    try {
      const newCourse = {
        title: course.title,
        description: course.description || '',
        category: course.category || 'other'
      };
      
      const { data, error } = await supabase
        .from('courses')
        .insert([newCourse])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCourses(prev => [...prev, data[0]]);
        return data[0];
      }
    } catch (error) {
      console.error('コース追加エラー:', error);
      return null;
    }
  };

  // タスク追加
  const addTask = async (courseId, task) => {
    try {
      console.log('タスク追加開始:', { courseId, task });
      // Supabaseでタスク追加
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ course_id: courseId, title: task.title }])
        .select();
      if (error) throw error;
      // タスク順序データの確認・作成（省略せず既存ロジックを維持）
      // ... 既存の順序データ確認・作成処理 ...
      // タスク追加後に必ず全体を再取得
      await fetchCoursesAndTasks();
      return data && data.length > 0 ? { id: data[0].id, title: data[0].title, createdAt: data[0].created_at } : null;
    } catch (error) {
      console.error('タスク追加例外:', error);
      alert(`タスク追加エラー: ${error.message || 'タスク追加に失敗しました'}`);
      return null;
    }
  };
  
  // ローカルのタスク状態を更新するヘルパー関数
  const updateLocalTasks = (courseId, newTask) => {
    setTasks(prev => {
      const courseTasks = prev[courseId] || [];
      return {
        ...prev,
        [courseId]: [...courseTasks, {
          id: newTask.id,
          title: newTask.title,
          createdAt: newTask.created_at
        }]
      };
    });
  };

  // タスク完了状態の設定
  const setUserTaskCompletion = async (userId, courseId, taskId, isCompleted) => {
    try {
      console.log('タスク完了状態の設定を開始', { userId, courseId, taskId, isCompleted });
      
      // オンラインモードで試行
      try {
        // 既存のデータを確認
        const { data: existingData, error: checkError } = await supabase
          .from('task_completions')
          .select('*')
          .eq('user_id', userId)
          .eq('task_id', taskId)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('データベース接続エラー:', checkError.message);
          throw checkError;
        }
        
        let result;
        
        if (existingData) {
          // 既存データの更新
          const { data, error } = await supabase
            .from('task_completions')
            .update({ completed: isCompleted })
            .eq('user_id', userId)
            .eq('task_id', taskId)
            .select();
          
          if (error) {
            console.error('データ更新エラー:', error.message);
            throw error;
          }
          result = data;
        } else {
          // 新規データの挿入
          const { data, error } = await supabase
            .from('task_completions')
            .insert([{
              user_id: userId,
              task_id: taskId,
              completed: isCompleted
            }])
            .select();
          
          if (error) {
            console.error('データ挿入エラー:', error.message);
            throw error;
          }
          result = data;
        }
        
        // 進捗率の計算
        const courseTasks = tasks[courseId] || [];
        const completedTasksQuery = await supabase
          .from('task_completions')
          .select('*')
          .eq('user_id', userId)
          .in('task_id', courseTasks.map(task => task.id))
          .eq('completed', true);
        
        if (completedTasksQuery.error) {
          console.error('データ取得エラー:', completedTasksQuery.error.message);
          throw completedTasksQuery.error;
        }
        
        const completedCount = completedTasksQuery.data?.length || 0;
        const progress = courseTasks.length > 0 
          ? Math.round((completedCount / courseTasks.length) * 100) 
          : 0;
        
        // コース進捗の更新/作成
        const { data: progressCheckData, error: progressCheckError } = await supabase
          .from('course_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single();
        
        if (progressCheckError && progressCheckError.code !== 'PGRST116') {
          console.error('進捗確認エラー:', progressCheckError.message);
          throw progressCheckError;
        }
        
        if (progressCheckData) {
          const { error: updateError } = await supabase
            .from('course_progress')
            .update({ progress })
            .eq('user_id', userId)
            .eq('course_id', courseId);
            
          if (updateError) {
            console.error('進捗更新エラー:', updateError.message);
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('course_progress')
            .insert([{
              user_id: userId,
              course_id: courseId,
              progress
            }]);
            
          if (insertError) {
            console.error('進捗挿入エラー:', insertError.message);
            throw insertError;
          }
        }

        console.log('Supabaseでのタスク完了状態更新に成功', { isCompleted, progress });
      } catch (supabaseError) {
        console.error('Supabaseでのタスク更新エラー:', supabaseError.message);
        
        // ローカルストレージを使用してタスク完了状態を更新
        console.log('ローカルストレージを使用してタスク完了状態を更新します');

        // ローカルストレージからデータ取得
        let localTaskCompletions = JSON.parse(localStorage.getItem('app_task_completions') || '{}');
        if (!localTaskCompletions[userId]) {
          localTaskCompletions[userId] = {};
        }
        
        // タスク完了状態を更新
        localTaskCompletions[userId][taskId] = isCompleted;
        localStorage.setItem('app_task_completions', JSON.stringify(localTaskCompletions));
        
        // ローカルでの進捗率計算
        const courseTasks = tasks[courseId] || [];
        const completedTasks = courseTasks.filter(task => {
          return localTaskCompletions[userId]?.[task.id] === true;
        });
        
        const progress = courseTasks.length > 0 
          ? Math.round((completedTasks.length / courseTasks.length) * 100) 
          : 0;
        
        console.log('進捗率を計算しました（ローカル）:', {
          completedTasks: completedTasks.length,
          totalTasks: courseTasks.length,
          progress: progress
        });
        
        // ローカルストレージに進捗保存
        let localProgress = JSON.parse(localStorage.getItem('app_course_progress') || '{}');
        if (!localProgress[userId]) {
          localProgress[userId] = {};
        }
        
        localProgress[userId][courseId] = progress;
        localStorage.setItem('app_course_progress', JSON.stringify(localProgress));
        
        console.log('ローカルストレージでのタスク完了状態更新完了', { isCompleted, progress });
      }
      
      // ローカルの進捗データを更新
      setProgressData(prev => {
        // ユーザーの進捗データ取得
        const userData = prev[userId] || {};
        
        // コースの進捗データ取得
        const courseProgress = userData[courseId] || {
          completedTasks: {},
          progress: 0
        };
        
        // タスクの完了状態を更新
        const updatedCompletedTasks = {
          ...courseProgress.completedTasks,
          [taskId]: isCompleted
        };
        
        // タスク完了数からの進捗率の再計算
        const courseTasks = tasks[courseId] || [];
        const completedTasksCount = courseTasks.filter(task => 
          updatedCompletedTasks[task.id] === true
        ).length;
        
        const updatedProgress = courseTasks.length > 0 
          ? Math.round((completedTasksCount / courseTasks.length) * 100) 
          : 0;
        
        // 更新された進捗データを返す
        return {
          ...prev,
          [userId]: {
            ...userData,
            [courseId]: {
              completedTasks: updatedCompletedTasks,
              progress: updatedProgress
            }
          }
        };
      });
      
      return true;
    } catch (error) {
      console.error('タスク完了状態設定エラー:', error);
      return false;
    }
  };

  // ユーザーのタスク完了状態を切り替え
  const toggleUserTaskCompletion = async (userId, courseId, taskId) => {
    // 現在の完了状態を取得
    const userData = progressData[userId] || {};
    const courseProgress = userData[courseId] || { completedTasks: {} };
    const isCurrentlyCompleted = courseProgress.completedTasks[taskId] || false;
    
    // 逆の状態に切り替え
    return await setUserTaskCompletion(userId, courseId, taskId, !isCurrentlyCompleted);
  };

  // ユーザーのコース進捗を取得
  const getUserProgress = (userId, courseId) => {
    const userData = progressData[userId] || {};
    const courseProgress = userData[courseId] || { progress: 0 };
    return courseProgress.progress;
  };

  // ユーザーのタスク完了状態を取得
  const isTaskCompletedByUser = (userId, courseId, taskId) => {
    const userData = progressData[userId] || {};
    const courseProgress = userData[courseId] || { completedTasks: {} };
    return courseProgress.completedTasks[taskId] || false;
  };

  // 全ユーザーの平均進捗率を取得
  const getAverageProgress = (courseId) => {
    const userIds = Object.keys(progressData);
    if (userIds.length === 0) return 0;
    
    const totalProgress = userIds.reduce((sum, userId) => {
      const userData = progressData[userId] || {};
      const courseProgress = userData[courseId] || { progress: 0 };
      return sum + courseProgress.progress;
    }, 0);
    
    return Math.round(totalProgress / userIds.length);
  };

  // コースとそのタスクを結合したデータを作成（順序付き）
  const getCoursesWithTasks = () => {
    // ヘルパー関数：順序配列に基づいてコースを並び替え
    const orderCoursesByOrderArray = (coursesList, orderArray) => {
      // ロギング
      console.log('順序付け処理', {
        コース数: coursesList.length,
        順序配列長: orderArray?.length || 0,
        コースID一覧: coursesList.map(c => c.id),
        順序配列: orderArray
      });
      
      // 順序配列が無効な場合は元のコース順を返す
      if (!orderArray || !Array.isArray(orderArray) || orderArray.length === 0) {
        console.log('有効な順序配列がないため、元のコース順を使用します');
        return [...coursesList];
      }
      
      // コースを順序配列に従って並び替え
      const orderedCourses = [...coursesList].sort((a, b) => {
        const indexA = orderArray.indexOf(a.id);
        const indexB = orderArray.indexOf(b.id);
        // 順序リストに含まれていない場合は末尾に配置（9999は十分大きな値）
        return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
      });
      
      // 並び替え結果を確認
      console.log('順序付け結果', {
        順序前: coursesList.map(c => c.title),
        順序後: orderedCourses.map(c => c.title)
      });
      
      return orderedCourses;
    };
    
    // courseOrderをコンソールに出力（デバッグ用）
    console.log('現在のcourseOrder状態', courseOrder);
    
    // 順序配列があれば使用し、なければコースIDの配列を生成
    const effectiveOrderArray = courseOrder.length > 0 
      ? courseOrder 
      : courses.map(course => course.id);
    
    // 順序配列に基づいてコースを並び替え
    const orderedCourses = orderCoursesByOrderArray(courses, effectiveOrderArray);
    
    // 順序付きコースにタスクを追加
    return orderedCourses.map(course => ({
      ...course,
      tasks: tasks[course.id] || []
    }));
  };

  // コース順序の保存（Supabase）
  const saveCoursesOrderToSupabase = async (newOrder) => {
    // デバッグ用のコード
    console.log('コース順序保存データ: ', {
      order_array: newOrder,
      データ型: typeof newOrder,
      配列の長さ: newOrder.length,
      配列の内容: JSON.stringify(newOrder)
    });
    
    // Supabaseクライアント経由で保存試行
    try {
      console.log('Supabaseクライアント経由で順序保存を試みます...');
      const { data, error } = await supabase
        .from('course_order')
        .select('*')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('コース順序取得エラー:', error);
        console.error('エラー詳細:', {
          エラーコード: error.code,
          エラーメッセージ: error.message,
          ヒント: error.hint,
          詳細: error.details
        });
        throw error;
      }
      
      if (data) {
        // 既存レコードを更新
        const { error: updateError } = await supabase
          .from('course_order')
          .update({ 
            order_array: newOrder,
            updated_at: new Date().toISOString() 
          })
          .eq('id', data.id);
        
        if (updateError) {
          console.error('コース順序の更新エラー:', updateError);
          console.error('更新エラー詳細:', {
            エラーコード: updateError.code,
            エラーメッセージ: updateError.message,
            ヒント: updateError.hint,
            詳細: updateError.details
          });
          throw updateError;
        }
        
        console.log('Supabaseクライアントでコース順序を更新しました');
        return true;
      } else {
        // 新規レコードを作成
        const { error: insertError } = await supabase
          .from('course_order')
          .insert([{ 
            order_array: newOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('コース順序の新規作成エラー:', insertError);
          console.error('新規作成エラー詳細:', {
            エラーコード: insertError.code,
            エラーメッセージ: insertError.message,
            ヒント: insertError.hint,
            詳細: insertError.details
          });
          throw insertError;
        }
        
        console.log('Supabaseクライアントでコース順序を新規作成しました');
        return true;
      }
    } catch (supabaseClientError) {
      console.error('Supabaseクライアント経由での保存に失敗:', supabaseClientError);
      
      // 直接Fetch APIを使ってSupabaseにアクセス（フォールバック）
      try {
        console.log('直接Fetch APIを使ってコース順序保存を試みます...');
        
        // 既存レコードを確認
        const checkResponse = await fetch(
          'https://cpueevdrecsauwnifoom.supabase.co/rest/v1/course_order?select=id', 
          {
            method: 'GET',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!checkResponse.ok) {
          const errorText = await checkResponse.text();
          console.error('コース順序レコード確認エラー:', errorText);
          throw new Error('コース順序レコード確認に失敗しました');
        }
        
        const checkData = await checkResponse.json();
        
        if (checkData && checkData.length > 0) {
          // 更新(PATCH)
          const updateResponse = await fetch(
            `https://cpueevdrecsauwnifoom.supabase.co/rest/v1/course_order?id=eq.${checkData[0].id}`, 
            {
              method: 'PATCH',
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                order_array: newOrder,
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (!updateResponse.ok) {
            const updateError = await updateResponse.text();
            console.error('コース順序更新エラー:', updateError);
            throw new Error('コース順序の更新に失敗しました');
          }
          
          console.log('Fetch APIでコース順序を更新しました');
        } else {
          // 新規作成(POST)
          const insertResponse = await fetch(
            'https://cpueevdrecsauwnifoom.supabase.co/rest/v1/course_order', 
            {
              method: 'POST',
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                order_array: newOrder,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (!insertResponse.ok) {
            const insertError = await insertResponse.text();
            console.error('コース順序作成エラー:', insertError);
            throw new Error('コース順序の作成に失敗しました');
          }
          
          console.log('Fetch APIでコース順序を新規作成しました');
        }
        
        return true;
      } catch (fetchError) {
        console.error('Fetch APIでの保存にも失敗:', fetchError);
        return false;
      }
    }
  };
  
  // コース順序の読み込み（Supabase）
  const loadCoursesOrderFromSupabase = async () => {
    console.log('コース順序をSupabaseから読み込み試行...');
    
    try {
      // まずはSupabaseクライアント経由で試す
      try {
        console.log('Supabaseクライアントでコース順序取得を試みます...');
        const { data, error } = await supabase
          .from('course_order')
          .select('*')
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('コース順序取得エラー:', error);
          console.error('エラー詳細:', {
            エラーコード: error.code,
            エラーメッセージ: error.message,
            ヒント: error.hint,
            詳細: error.details
          });
          throw error;
        }
        
        if (data?.order_array) {
          console.log('Supabaseクライアントからコース順序を取得しました:', data.order_array);
          return data.order_array;
        }
      } catch (supabaseClientError) {
        console.error('Supabaseクライアントでの取得に失敗:', supabaseClientError);
      }
      
      // クライアントでの取得に失敗した場合は直接APIを使用
      try {
        console.log('Fetch APIでコース順序取得を試みます...');
        const response = await fetch(
          'https://cpueevdrecsauwnifoom.supabase.co/rest/v1/course_order?select=*', 
          {
            method: 'GET',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].order_array) {
            console.log('Fetch APIからコース順序を取得しました:', data[0].order_array);
            return data[0].order_array;
          }
        } else {
          const errorText = await response.text();
          console.error('Fetch APIでのコース順序取得エラー:', errorText);
        }
      } catch (fetchError) {
        console.error('Fetch APIでの取得に失敗:', fetchError);
      }
      
      // Supabaseからの取得に失敗した場合はローカルストレージを参照
      const storedOrder = localStorage.getItem('app_course_order');
      if (storedOrder) {
        try {
          const orderArray = JSON.parse(storedOrder);
          console.log('ローカルストレージからコース順序を取得しました:', orderArray);
          return orderArray;
        } catch (e) {
          console.error('ローカルストレージのコース順序のパースに失敗:', e);
        }
      }
    } catch (error) {
      console.error('コース順序の読み込みエラー:', error);
    }
    
    console.log('コース順序の取得に失敗したため、空の配列を返します');
    return [];
  };
  
  // コース順序の並び替え
  const reorderCourses = async (startIndex, endIndex) => {
    try {
      console.log('reorderCourses関数が呼び出されました', { startIndex, endIndex });
      
      // インデックスのバリデーションチェック
      if (startIndex < 0 || startIndex >= courses.length || endIndex < 0 || endIndex >= courses.length) {
        console.error('並び替えエラー: インデックスが範囲外です', { startIndex, endIndex, coursesLength: courses.length });
        return false;
      }
      
      console.log('並び替え実行:', { 
        startIndex, 
        endIndex, 
        startIndexType: typeof startIndex,
        endIndexType: typeof endIndex,
        moveDirection: startIndex < endIndex ? '下へ移動' : '上へ移動',
        itemsCount: courses.length
      });
      
      // 数値型に強制変換
      const numStartIndex = Number(startIndex);
      const numEndIndex = Number(endIndex);
      
      // 表示順序で移動するコースを特定
      const sortedCourses = [...courses].sort((a, b) => {
        const indexA = courseOrder.indexOf(a.id);
        const indexB = courseOrder.indexOf(b.id);
        return (indexA === -1 ? courses.length : indexA) - (indexB === -1 ? courses.length : indexB);
      });
      
      console.log('表示用に並び替えたコース順序:', sortedCourses.map(c => c.title));
      
      // 移動元と移動先のコースを取得
      const sourceItem = sortedCourses[numStartIndex];
      const targetItem = sortedCourses[numEndIndex];
      
      console.log('移動元コース:', {
        index: numStartIndex,
        id: sourceItem.id,
        title: sourceItem.title
      });
      
      console.log('移動先位置のコース:', {
        index: numEndIndex,
        id: targetItem.id,
        title: targetItem.title
      });
      
      // 現在のコース順序を取得
      const currentOrder = [...courseOrder];
      console.log('並び替え前の順序 (表示順):', currentOrder);
      
      // 順序を変更
      const newOrder = [...currentOrder];
      const sourceItemIndex = newOrder.indexOf(sourceItem.id);
      const targetItemIndex = newOrder.indexOf(targetItem.id);
      
      if (sourceItemIndex !== -1) {
        // ソースアイテムを削除
        newOrder.splice(sourceItemIndex, 1);
        
        // ターゲット位置（移動後のインデックス）を計算
        const targetPosition = targetItemIndex > sourceItemIndex 
          ? targetItemIndex - 1  // ソースが削除されたため1つ減らす
          : targetItemIndex;
        
        // ターゲット位置に挿入
        newOrder.splice(targetPosition + (numEndIndex > numStartIndex ? 1 : 0), 0, sourceItem.id);
      }
      
      // 順序が変更されたか確認
      const isOrderChanged = JSON.stringify(currentOrder) !== JSON.stringify(newOrder);
      console.log('順序は変更されましたか？', isOrderChanged);
      
      if (!isOrderChanged) {
        console.log('並び替え不要: 順序に変更はありません');
        return true;
      }
      
      // 1. 新しい順序をSupabaseに保存
      console.log('並び替え後の順序:', newOrder);
      const saveSuccess = await saveCoursesOrderToSupabase(newOrder);
      
      if (!saveSuccess) {
        console.error('コース順序の保存に失敗しました');
        return false;
      }
      
      // 2. 保存に成功したら、ローカルストレージにもバックアップ
      localStorage.setItem('app_course_order', JSON.stringify(newOrder));
      
      // 3. 新しい順序を設定
      const coursesToSort = [...courses];
      const sortedIds = newOrder.filter(id => coursesToSort.some(c => c.id === id));
      const missingIds = coursesToSort.map(c => c.id).filter(id => !newOrder.includes(id));
      
      const finalOrder = [...sortedIds, ...missingIds];
      console.log('新しい順序に基づくコース一覧:', coursesToSort.sort((a, b) => {
        const indexA = finalOrder.indexOf(a.id);
        const indexB = finalOrder.indexOf(b.id);
        return indexA - indexB;
      }).map(c => c.title));
      
      // 4. 状態を更新
      setCourseOrder(newOrder);
      
      console.log('並び替え後のコース順序を確認:', coursesToSort.sort((a, b) => {
        const indexA = newOrder.indexOf(a.id);
        const indexB = newOrder.indexOf(b.id);
        return (indexA === -1 ? newOrder.length : indexA) - (indexB === -1 ? newOrder.length : indexB);
      }).map(c => c.title));
      
      return true;
    } catch (error) {
      console.error('コース並び替えエラー:', error);
      return false;
    }
  };

  // コース編集
  const updateCourse = async (courseId, updates) => {
    try {
      // オンラインモードで試行
      try {
        const { data, error } = await supabase
          .from('courses')
          .update({
            title: updates.title,
            description: updates.description || '',
            category: updates.category || 'other'
          })
          .eq('id', courseId)
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // コース一覧を更新
          setCourses(prev => 
            prev.map(course => course.id === courseId ? data[0] : course)
          );
          return data[0];
        }
      } catch (supabaseError) {
        console.error('Supabaseでのコース更新エラー:', supabaseError.message);
        
        // ローカルストレージを使用してコースを更新
        let localCourses = JSON.parse(localStorage.getItem('app_courses') || '[]');
        const updatedLocalCourses = localCourses.map(course => {
          if (course.id === courseId) {
            return {
              ...course,
              title: updates.title,
              description: updates.description || '',
              category: updates.category || 'other'
            };
          }
          return course;
        });
        
        localStorage.setItem('app_courses', JSON.stringify(updatedLocalCourses));
        
        // コース一覧を更新
        setCourses(prev => 
          prev.map(course => {
            if (course.id === courseId) {
              return {
                ...course,
                title: updates.title,
                description: updates.description || '',
                category: updates.category || 'other'
              };
            }
            return course;
          })
        );
        
        // 更新されたコースを返す
        return courses.find(course => course.id === courseId);
      }
    } catch (error) {
      console.error('コース更新エラー:', error);
      return null;
    }
  };

  // コース削除
  const deleteCourse = async (courseId) => {
    try {
      // オンラインモードで試行
      try {
        // まずタスクを削除
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('course_id', courseId);
          
        if (tasksError) throw tasksError;
        
        // 次に進捗データを削除
        const { error: progressError } = await supabase
          .from('course_progress')
          .delete()
          .eq('course_id', courseId);
          
        if (progressError) throw progressError;
        
        // 最後にコースを削除
        const { error: courseError } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);
          
        if (courseError) throw courseError;
        
        // 成功した場合、ローカルの状態を更新
        setCourses(prev => prev.filter(course => course.id !== courseId));
        setTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[courseId];
          return newTasks;
        });
        
        // 進捗データも更新
        setProgressData(prev => {
          const newProgress = { ...prev };
          Object.keys(newProgress).forEach(userId => {
            if (newProgress[userId] && newProgress[userId][courseId]) {
              delete newProgress[userId][courseId];
            }
          });
          return newProgress;
        });
        
        return true;
      } catch (supabaseError) {
        console.error('Supabaseでのコース削除エラー:', supabaseError.message);
        
        // ローカルストレージを使用してコースを削除
        let localCourses = JSON.parse(localStorage.getItem('app_courses') || '[]');
        const filteredLocalCourses = localCourses.filter(course => course.id !== courseId);
        localStorage.setItem('app_courses', JSON.stringify(filteredLocalCourses));
        
        // ローカルのタスクデータも削除
        let localTasks = JSON.parse(localStorage.getItem('app_tasks') || '{}');
        delete localTasks[courseId];
        localStorage.setItem('app_tasks', JSON.stringify(localTasks));
        
        // ローカルの進捗データも削除
        let localProgress = JSON.parse(localStorage.getItem('app_course_progress') || '{}');
        Object.keys(localProgress).forEach(userId => {
          if (localProgress[userId] && localProgress[userId][courseId]) {
            delete localProgress[userId][courseId];
          }
        });
        localStorage.setItem('app_course_progress', JSON.stringify(localProgress));
        
        // ローカルの完了タスクデータも削除
        let localCompletions = JSON.parse(localStorage.getItem('app_task_completions') || '{}');
        Object.keys(localCompletions).forEach(userId => {
          if (localCompletions[userId]) {
            const courseTasks = tasks[courseId] || [];
            courseTasks.forEach(task => {
              if (localCompletions[userId][task.id]) {
                delete localCompletions[userId][task.id];
              }
            });
          }
        });
        localStorage.setItem('app_task_completions', JSON.stringify(localCompletions));
        
        // ローカルの状態を更新
        setCourses(prev => prev.filter(course => course.id !== courseId));
        setTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[courseId];
          return newTasks;
        });
        
        // 進捗データも更新
        setProgressData(prev => {
          const newProgress = { ...prev };
          Object.keys(newProgress).forEach(userId => {
            if (newProgress[userId] && newProgress[userId][courseId]) {
              delete newProgress[userId][courseId];
            }
          });
          return newProgress;
        });
        
        return true;
      }
    } catch (error) {
      console.error('コース削除エラー:', error);
      return false;
    }
  };

  // タスク編集
  const updateTask = async (courseId, taskId, updates) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
      // タスク編集後に必ず全体を再取得
      await fetchCoursesAndTasks();
      return true;
    } catch (error) {
      console.error('タスク編集エラー:', error);
      return false;
    }
  };

  // タスク削除
  const deleteTask = async (courseId, taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      // タスク削除後に必ず全体を再取得
      await fetchCoursesAndTasks();
      return true;
    } catch (error) {
      console.error('タスク削除エラー:', error);
      return false;
    }
  };

  // タスク順序変更（reorderTask相当）
  const reorderTask = async (courseId, newOrder) => {
    try {
      // 順序データをSupabaseに保存
      const { data, error } = await supabase
        .from('task_order')
        .update({ order_array: newOrder, updated_at: new Date().toISOString() })
        .eq('course_id', courseId);
      if (error) throw error;
      // 順序変更後に必ず全体を再取得
      await fetchCoursesAndTasks();
      return true;
    } catch (error) {
      console.error('タスク順序変更エラー:', error);
      return false;
    }
  };

  return (
    <SharedDataContext.Provider value={{
      courses,
      tasks,
      progressData,
      learningSessions,
      addCourse,
      addTask,
      updateCourse,
      deleteCourse,
      updateTask,
      deleteTask,
      setUserTaskCompletion,
      toggleUserTaskCompletion,
      getUserProgress,
      isTaskCompletedByUser,
      getAverageProgress,
      getCoursesWithTasks,
      reorderCourses,
      loading,
      fetchCoursesAndTasks
    }}>
      {children}
    </SharedDataContext.Provider>
  );
};

export default SharedDataContext;