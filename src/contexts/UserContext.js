import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

// Supabase設定情報を取得
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://cpueevdrecsauwnifoom.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);  // ローカルストレージフォールバック

  // 初期ロード
  useEffect(() => {
    const fetchUsers = async () => {
      console.log('ユーザー取得を開始します。ローカルストレージモード:', useLocalStorage);
      setLoading(true);
      
      try {
        // ローカルストレージモードの場合
        if (useLocalStorage) {
          const storedUsers = localStorage.getItem('app_users');
          if (storedUsers) {
            try {
              const userData = JSON.parse(storedUsers);
              
              // 並び順を復元
              const userOrder = await loadUserOrderFromSupabase();
              if (userOrder && userOrder.length > 0) {
                console.log('ユーザー並び順を復元します:', userOrder);
                const orderedUsers = orderUsersByOrderArray(userData, userOrder);
                setUsers(orderedUsers);
                console.log('ローカルストレージから順序付きユーザーをロードしました:', orderedUsers.length);
              } else {
                setUsers(userData);
                console.log('ローカルストレージからユーザーをロードしました（順序無し）:', userData.length);
              }
              
              return;
            } catch (parseError) {
              console.error('ローカルストレージのパースエラー:', parseError);
            }
          }
          console.log('ローカルストレージに保存されたユーザーがありません');
          setUsers([]);
          return;
        }

        // オンライン（Supabase）モード
        console.log('Supabaseからユーザーを取得中...');
        const { data, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) {
          console.error('Supabaseユーザー取得エラー:', error);
          // エラー時はローカルストレージにフォールバック
          setUseLocalStorage(true);
          return;
        }
        
        if (data) {
          console.log('Supabaseからユーザーを取得しました:', data.length);
          
          // 並び順を復元
          const userOrder = await loadUserOrderFromSupabase();
          if (userOrder && userOrder.length > 0) {
            console.log('ユーザー並び順を復元します:', userOrder);
            const orderedUsers = orderUsersByOrderArray(data, userOrder);
            setUsers(orderedUsers);
            console.log('Supabaseから順序付きユーザーをロードしました:', orderedUsers.length);
          } else {
            setUsers(data);
            console.log('Supabaseからユーザーをロードしました（順序無し）:', data.length);
          }
          
          // ローカルストレージにも保存（バックアップとして）
          localStorage.setItem('app_users', JSON.stringify(data));
        } else {
          console.log('ユーザーが存在しません');
          setUsers([]);
        }
      } catch (error) {
        console.error('ユーザー取得中にエラーが発生:', error);
        
        // オンラインモードでエラーが発生した場合、ローカルストレージにフォールバック
        if (!useLocalStorage) {
          console.log('ローカルストレージモードにフォールバック');
          setUseLocalStorage(true);
          // 再帰的に呼び出してローカルストレージから読み込み
          await fetchUsers();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    // 保存されていた現在のユーザーを取得
    const loadCurrentUser = () => {
      const savedCurrentUser = localStorage.getItem('currentUser');
      if (savedCurrentUser) {
        setCurrentUser(JSON.parse(savedCurrentUser));
      }
    };

    fetchUsers();
    loadCurrentUser();
  }, []);

  // ユーザー一覧をlocalStorageにもバックアップ
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('app_users', JSON.stringify(users));
    }
  }, [users]);

  // 現在のユーザーをlocalStorageに保存
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // ユーザー追加
  const addUser = async (user) => {
    if (!user || !user.name || user.name.trim() === '') {
      console.error('有効なユーザー名が必要です');
      return null;
    }

    // ローカルストレージモードの場合
    if (useLocalStorage) {
      try {
        console.log('ローカルストレージを使用してユーザーを作成します');
        const newUser = {
          id: uuidv4(),
          name: user.name.trim(),
          created_at: new Date().toISOString()
        };
        
        setUsers(prevUsers => [...prevUsers, newUser]);
        return newUser;
      } catch (error) {
        console.error('ローカルユーザー作成エラー:', error);
        return null;
      }
    }

    // オンラインモード
    try {
      console.log('ユーザーを作成します:', { name: user.name });
      
      try {
        // まずはsupabaseクライアントで試す
        const { data, error } = await supabase
          .from('users')
          .insert([{ name: user.name.trim() }])
          .select();
        
        if (error) {
          console.error('Supabaseクライアントエラー:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log('Supabaseでユーザー作成成功:', data[0]);
          setUsers(prevUsers => [...prevUsers, data[0]]);
          return data[0];
        }
        
        throw new Error('データが返されませんでした');
      } catch (clientError) {
        console.error('Supabaseクライアント例外:', clientError);
        
        // 次にFetch APIで直接試す
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: user.name.trim()
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Fetch APIエラー:', errorText);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            console.log('Fetch APIでユーザー作成成功:', data[0]);
            setUsers(prevUsers => [...prevUsers, data[0]]);
            return data[0];
          }
          
          throw new Error('データが返されませんでした');
        } catch (fetchError) {
          console.error('Fetch API例外:', fetchError);
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('ユーザー追加に失敗しました。ローカルストレージを使用します:', error);
      setUseLocalStorage(true);
      
      // ローカルストレージにフォールバック
      const newUser = {
        id: uuidv4(),
        name: user.name.trim(),
        created_at: new Date().toISOString()
      };
      
      setUsers(prevUsers => [...prevUsers, newUser]);
      return newUser;
    }
  };

  // ログイン
  const login = async (userId) => {
    try {
      // ローカルストレージモードならローカルで検索
      if (useLocalStorage) {
        const user = users.find(u => u.id === userId);
        if (user) {
          setCurrentUser(user);
          return user;
        }
        return null;
      }
      
      // オンラインモード
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Supabaseログインエラー:', error);
          throw error;
        }
        
        if (data) {
          console.log('ログイン成功:', data);
          setCurrentUser(data);
          return data;
        }
      } catch (error) {
        console.error('ログイン失敗:', error);
        
        // ローカルにフォールバック
        const user = users.find(u => u.id === userId);
        if (user) {
          setCurrentUser(user);
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('ログインエラー:', error);
      return null;
    }
  };

  // ログアウト
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  // ユーザー情報更新
  const updateUser = async (userId, updates) => {
    try {
      // ローカルストレージモードならローカルで更新
      if (useLocalStorage) {
        const updatedUsers = users.map(user => {
          if (user.id === userId) {
            const updatedUser = { ...user, ...updates };
            if (currentUser && currentUser.id === userId) {
              setCurrentUser(updatedUser);
            }
            return updatedUser;
          }
          return user;
        });
        
        setUsers(updatedUsers);
        return users.find(u => u.id === userId);
      }
      
      // オンラインモード
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Supabaseユーザー更新エラー:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('ユーザー更新成功:', data[0]);
        // ユーザーリストを更新
        setUsers(prevUsers => 
          prevUsers.map(user => user.id === userId ? data[0] : user)
        );
        
        // 現在のユーザーも更新
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(data[0]);
        }
        
        return data[0];
      }
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      
      if (!useLocalStorage) {
        // ローカルストレージにフォールバック
        setUseLocalStorage(true);
        return updateUser(userId, updates);
      }
    }
  };

  // ユーザー削除
  const deleteUser = async (userId) => {
    try {
      // 現在ログイン中のユーザーを削除しようとしている場合はエラー
      if (currentUser && currentUser.id === userId) {
        throw new Error('現在ログイン中のユーザーは削除できません');
      }

      // ローカルストレージモードならローカルで削除
      if (useLocalStorage) {
        const filteredUsers = users.filter(user => user.id !== userId);
        setUsers(filteredUsers);
        return { success: true };
      }
      
      // オンラインモード
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('Supabaseユーザー削除エラー:', error);
        throw error;
      }
      
      // ユーザーリストから削除
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      return { success: true };
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      
      if (!useLocalStorage) {
        // ローカルストレージにフォールバック
        setUseLocalStorage(true);
        return deleteUser(userId);
      }
      
      return { success: false, error: error.message };
    }
  };

  // ユーザー順序をSupabaseに保存する関数
  const saveUserOrderToSupabase = async (userOrder) => {
    try {
      console.log('ユーザー順序をSupabaseに保存します:', userOrder);
      
      // Supabaseクライアント経由で保存試行
      try {
        const { data, error } = await supabase
          .from('user_order')
          .select('*')
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('ユーザー順序取得エラー:', error);
          throw error;
        }
        
        if (data) {
          // 既存レコードを更新
          const { error: updateError } = await supabase
            .from('user_order')
            .update({ 
              order_array: userOrder,
              updated_at: new Date().toISOString() 
            })
            .eq('id', data.id);
          
          if (updateError) {
            console.error('ユーザー順序の更新エラー:', updateError);
            throw updateError;
          }
          
          console.log('Supabaseでユーザー順序を更新しました');
        } else {
          // 新規レコードを作成
          const { error: insertError } = await supabase
            .from('user_order')
            .insert([{ 
              order_array: userOrder,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          
          if (insertError) {
            console.error('ユーザー順序の新規作成エラー:', insertError);
            throw insertError;
          }
          
          console.log('Supabaseでユーザー順序を新規作成しました');
        }
        
        return true;
      } catch (supabaseClientError) {
        console.error('Supabaseクライアント経由での保存に失敗:', supabaseClientError);
        
        // 直接Fetch APIを使ってSupabaseにアクセス（フォールバック）
        try {
          console.log('Fetch APIを使ってユーザー順序保存を試みます...');
          
          // 既存レコードを確認
          const checkResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/user_order?select=id`, 
            {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (!checkResponse.ok) {
            const errorText = await checkResponse.text();
            console.error('ユーザー順序レコード確認エラー:', errorText);
            throw new Error('ユーザー順序レコード確認に失敗しました');
          }
          
          const checkData = await checkResponse.json();
          
          if (checkData && checkData.length > 0) {
            // 更新(PATCH)
            const updateResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/user_order?id=eq.${checkData[0].id}`, 
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  order_array: userOrder,
                  updated_at: new Date().toISOString()
                })
              }
            );
            
            if (!updateResponse.ok) {
              const updateError = await updateResponse.text();
              console.error('ユーザー順序更新エラー:', updateError);
              throw new Error('ユーザー順序の更新に失敗しました');
            }
            
            console.log('Fetch APIでユーザー順序を更新しました');
          } else {
            // 新規作成(POST)
            const insertResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/user_order`, 
              {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  order_array: userOrder,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              }
            );
            
            if (!insertResponse.ok) {
              const insertError = await insertResponse.text();
              console.error('ユーザー順序作成エラー:', insertError);
              throw new Error('ユーザー順序の作成に失敗しました');
            }
            
            console.log('Fetch APIでユーザー順序を新規作成しました');
          }
          
          return true;
        } catch (fetchError) {
          console.error('Fetch APIでの保存にも失敗:', fetchError);
          return false;
        }
      }
    } catch (error) {
      console.error('ユーザー順序保存エラー:', error);
      return false;
    }
  };

  // ユーザー順序をSupabaseから読み込む関数
  const loadUserOrderFromSupabase = async () => {
    try {
      console.log('ユーザー順序をSupabaseから読み込み試行...');
      
      // まずはSupabaseクライアント経由で試す
      try {
        const { data, error } = await supabase
          .from('user_order')
          .select('*')
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('ユーザー順序取得エラー:', error);
          throw error;
        }
        
        if (data?.order_array) {
          console.log('Supabaseからユーザー順序を取得しました:', data.order_array);
          return data.order_array;
        }
      } catch (supabaseClientError) {
        console.error('Supabaseクライアントでの取得に失敗:', supabaseClientError);
      }
      
      // クライアントでの取得に失敗した場合は直接APIを使用
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/user_order?select=*`, 
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].order_array) {
            console.log('Fetch APIからユーザー順序を取得しました:', data[0].order_array);
            return data[0].order_array;
          }
        } else {
          const errorText = await response.text();
          console.error('Fetch APIでのユーザー順序取得エラー:', errorText);
        }
      } catch (fetchError) {
        console.error('Fetch APIでの取得に失敗:', fetchError);
      }
      
      // Supabaseからの取得に失敗した場合はローカルストレージを参照
      const storedOrder = localStorage.getItem('app_user_order');
      if (storedOrder) {
        try {
          const orderArray = JSON.parse(storedOrder);
          console.log('ローカルストレージからユーザー順序を取得しました:', orderArray);
          return orderArray;
        } catch (e) {
          console.error('ローカルストレージのユーザー順序のパースに失敗:', e);
        }
      }
    } catch (error) {
      console.error('ユーザー順序の読み込みエラー:', error);
    }
    
    console.log('ユーザー順序の取得に失敗したため、空の配列を返します');
    return [];
  };

  // ヘルパー関数：順序配列に基づいてユーザーを並び替え
  const orderUsersByOrderArray = (usersList, orderArray) => {
    console.log('ユーザー並び替え処理', {
      ユーザー数: usersList.length,
      順序配列長: orderArray?.length || 0,
      ユーザーID一覧: usersList.map(u => u.id),
      順序配列: orderArray
    });
    
    // 順序配列が無効な場合は元のユーザー順を返す
    if (!orderArray || !Array.isArray(orderArray) || orderArray.length === 0) {
      console.log('有効な順序配列がないため、元のユーザー順を使用します');
      return [...usersList];
    }
    
    // ユーザーを順序配列に従って並び替え
    const orderedUsers = [...usersList].sort((a, b) => {
      const indexA = orderArray.indexOf(a.id);
      const indexB = orderArray.indexOf(b.id);
      
      // 順序配列にないユーザーは最後に配置
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
    
    console.log('ユーザー並び替え完了:', orderedUsers.map(u => ({id: u.id, name: u.name})));
    return orderedUsers;
  };

  // ユーザーの順序変更
  const reorderUsers = async (startIndex, endIndex) => {
    try {
      console.log('ユーザー順序変更:', { startIndex, endIndex });
      
      if (startIndex === endIndex) {
        return true;
      }

      const result = [...users];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      // 新しい順序のIDリストを作成
      const newOrder = result.map(user => user.id);
      console.log('新しいユーザー順序:', newOrder);

      // Supabaseに順序を保存
      const saveSuccess = await saveUserOrderToSupabase(newOrder);
      
      if (saveSuccess) {
        console.log('ユーザー順序をSupabaseに保存しました');
      } else {
        console.warn('ユーザー順序のSupabase保存に失敗しましたが、ローカルで継続します');
      }

      // ローカルストレージにもバックアップ
      localStorage.setItem('app_user_order', JSON.stringify(newOrder));
      
      // 状態を更新
      setUsers(result);
      console.log('ユーザー順序変更完了');
      return true;
    } catch (error) {
      console.error('ユーザー順序変更エラー:', error);
      return false;
    }
  };

  return (
    <UserContext.Provider value={{ 
      users, 
      currentUser, 
      addUser, 
      login, 
      logout, 
      updateUser,
      deleteUser,
      reorderUsers,
      loading,
      isUsingLocalStorage: useLocalStorage
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;