import React, { useState } from 'react';

function StudySession({ courses, onAddStudySession }) {
  const [courseId, setCourseId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!courseId) return;
    
    onAddStudySession({
      courseId,
      duration: 0, // 固定値
      notes: '', // 空文字列で固定
      date: new Date().toISOString()
    });
    
    // フォームをリセット
    setCourseId('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="course">コース</label>
        <select
          id="course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          required
        >
          <option value="">選択してください</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>
      
      <button type="submit">学習記録を追加</button>
    </form>
  );
}

export default StudySession;