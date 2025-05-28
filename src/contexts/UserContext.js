import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

// Supabaseのベース情報
const SUPABASE_URL = 'https://cpueevdrecsauwnifoom.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVldmRyZWNzYXV3bmlmb29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNzU3NDYsImV4cCI6MjA2MTg1MTc0Nn0.HqwV6dhELkH7ZDCMuHTYO7TY6v0h4GcPUbCPwwYix4I';

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
      try {
        console.log('ユーザー一覧を取得しています...');
        
        try {
          // まずはSupabaseクライアントで試す
          const { data, error } = await supabase.from('users').select('*');
          
          if (error) {
            console.error('Supabaseクライアントエラー:', error);
            throw error;
          }
          
          console.log('Supabaseから取得したユーザー:', data);
          setUsers(data || []);
          return;
        } catch (clientError) {
          console.error('Supabaseクライアント例外:', clientError);
          
          // 次にFetch APIで直接試す
          try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              }
            });
            
            if (!response.ok) {
              throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Fetch APIから取得したユーザー:', data);
            setUsers(data);
            return;
          } catch (fetchError) {
            console.error('Fetch API例外:', fetchError);
            throw fetchError;
          }
        }
      } catch (error) {
        console.error('ユーザー一覧の取得に失敗しました。ローカルストレージを使用します:', error);
        setUseLocalStorage(true);
        
        // ローカルストレージから復元
        const savedUsers = localStorage.getItem('app_users');
        if (savedUsers) {
          console.log('ローカルストレージからユーザーを復元します');
          setUsers(JSON.parse(savedUsers));
        } else {
          // 初回の場合は空配列を保存
          localStorage.setItem('app_users', JSON.stringify([]));
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

  // ユーザーの順序変更
  const reorderUsers = (startIndex, endIndex) => {
    try {
      console.log('ユーザー順序変更:', { startIndex, endIndex });
      
      if (startIndex === endIndex) {
        return;
      }

      const result = [...users];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

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