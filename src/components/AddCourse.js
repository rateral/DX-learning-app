import React, { useState } from 'react';

function AddCourse({ onAddCourse }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    onAddCourse({
      title,
      description: '', // 空文字列で固定
      category: 'other', // デフォルト値で固定
      createdAt: new Date().toISOString()
    });
    
    // フォームをリセット
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">
          コース名
          <span style={{ 
            marginLeft: '10px', 
            fontSize: '0.8rem', 
            backgroundColor: '#3f51b5', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px' 
          }}>
            全ユーザー共有
          </span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      
      <button 
        type="submit"
        style={{ backgroundColor: '#3f51b5' }}
      >
        コースを追加
      </button>
    </form>
  );
}

export default AddCourse;