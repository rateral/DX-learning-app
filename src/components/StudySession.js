import React, { useState } from 'react';

function StudySession({ courses, onAddStudySession }) {
  const [courseId, setCourseId] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!courseId || !duration) return;
    
    onAddStudySession({
      courseId,
      duration: parseInt(duration, 10),
      notes,
      date: new Date().toISOString()
    });
    
    // フォームをリセット
    setCourseId('');
    setDuration('');
    setNotes('');
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
      
      <div className="form-group">
        <label htmlFor="duration">学習時間（分）</label>
        <input
          type="number"
          id="duration"
          min="1"
          max="1440"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes">メモ</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
        />
      </div>
      
      <button type="submit">学習記録を追加</button>
    </form>
  );
}

export default StudySession;