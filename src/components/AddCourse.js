import React, { useState } from 'react';

function AddCourse({ onAddCourse }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    onAddCourse({
      title,
      description,
      category,
      createdAt: new Date().toISOString()
    });
    
    // フォームをリセット
    setTitle('');
    setDescription('');
    setCategory('');
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
      
      <div className="form-group">
        <label htmlFor="category">カテゴリ</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">選択してください</option>
          <option value="programming">プログラミング</option>
          <option value="language">語学</option>
          <option value="math">数学</option>
          <option value="science">科学</option>
          <option value="other">その他</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="description">説明</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
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