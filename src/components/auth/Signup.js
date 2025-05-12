import React, { useState } from 'react';
import { supabase } from '../../supabase';

export default function Signup({ onSignup, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setMessage('登録メールを確認してください。');
      onSignup && onSignup();
    }
  };

  return (
    <form onSubmit={handleSignup} style={{ maxWidth: 350, margin: '40px auto' }}>
      <h2>新規登録</h2>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="パスワード（6文字以上）"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <button type="submit" style={{ width: '100%' }}>登録</button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {message && <div style={{ color: 'green', marginTop: 10 }}>{message}</div>}
      <div style={{ marginTop: 20 }}>
        すでにアカウントをお持ちの方は
        <button type="button" onClick={onSwitch} style={{ marginLeft: 5 }}>ログイン</button>
      </div>
    </form>
  );
} 