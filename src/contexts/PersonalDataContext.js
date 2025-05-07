import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { supabase } from '../supabase';

const PersonalDataContext = createContext();

export const usePersonalData = () => useContext(PersonalDataContext);

export const PersonalDataProvider = ({ children }) => {
  const { currentUser } = useUser();
  
  // 学習セッションデータ
  const [studySessions, setStudySessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ユーザー変更時にデータをロード
  useEffect(() => {
    const fetchStudySessions = async () => {
      if (!currentUser) {
        setStudySessions([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('session_date', { ascending: false });
        
        if (error) throw error;
        
        // データをフロントエンドの形式に変換
        const formattedSessions = data.map(session => ({
          id: session.id,
          courseId: session.course_id,
          duration: session.duration,
          notes: session.notes || '',
          date: session.session_date,
          userId: session.user_id
        }));
        
        setStudySessions(formattedSessions);
      } catch (error) {
        console.error('学習セッション取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudySessions();
  }, [currentUser]);

  // 学習セッション追加
  const addStudySession = async (sessionData) => {
    if (!currentUser) return null;
    
    try {
      const newSession = {
        user_id: currentUser.id,
        course_id: sessionData.courseId,
        duration: sessionData.duration,
        notes: sessionData.notes || '',
        session_date: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([newSession])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // フロントエンド用のフォーマットに変換
        const formattedSession = {
          id: data[0].id,
          courseId: data[0].course_id,
          duration: data[0].duration,
          notes: data[0].notes || '',
          date: data[0].session_date,
          userId: data[0].user_id
        };
        
        setStudySessions(prev => [formattedSession, ...prev]);
        return formattedSession;
      }
    } catch (error) {
      console.error('学習セッション追加エラー:', error);
      return null;
    }
  };

  // 学習セッション削除
  const deleteStudySession = async (sessionId) => {
    if (!currentUser) return false;
    
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      // ローカルの状態を更新
      setStudySessions(prev => prev.filter(session => session.id !== sessionId));
      return true;
    } catch (error) {
      console.error('学習セッション削除エラー:', error);
      return false;
    }
  };

  // 学習セッション更新
  const updateStudySession = async (sessionId, updates) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', currentUser.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // フロントエンド用のフォーマットに変換
        const formattedSession = {
          id: data[0].id,
          courseId: data[0].course_id,
          duration: data[0].duration,
          notes: data[0].notes || '',
          date: data[0].session_date,
          userId: data[0].user_id
        };
        
        // ローカルの状態を更新
        setStudySessions(prev => 
          prev.map(session => session.id === sessionId ? formattedSession : session)
        );
        
        return formattedSession;
      }
    } catch (error) {
      console.error('学習セッション更新エラー:', error);
      return null;
    }
  };

  // ユーザーのコース別総学習時間
  const getUserCourseStudyTime = async (courseId) => {
    if (!currentUser) return 0;
    
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', currentUser.id)
        .eq('course_id', courseId);
      
      if (error) throw error;
      
      return data.reduce((total, session) => total + session.duration, 0);
    } catch (error) {
      console.error('学習時間取得エラー:', error);
      return 0;
    }
  };

  return (
    <PersonalDataContext.Provider value={{
      studySessions,
      addStudySession,
      deleteStudySession,
      updateStudySession,
      getUserCourseStudyTime,
      loading
    }}>
      {children}
    </PersonalDataContext.Provider>
  );
};

export default PersonalDataContext;