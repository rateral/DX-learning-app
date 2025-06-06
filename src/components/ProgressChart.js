import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function ProgressChart({ courses }) {
  // coursesの安全性チェック
  if (!courses || !Array.isArray(courses)) {
    return (
      <div>
        <div className="chart-container">
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }
  
  // コース進捗データ
  const progressData = {
    labels: courses.map(course => course.title),
    datasets: [
      {
        label: '進捗率 (%)',
        data: courses.map(course => course.progress || 0),
        backgroundColor: 'rgba(76, 175, 80, 0.6)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1
      }
    ]
  };
  
  // チャートオプション
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false  // タイトルを表示しない
      }
    }
  };
  
  return (
    <div>
      <div className="chart-container">
        {courses.length === 0 ? (
          <p>データがありません。コースを追加してください。</p>
        ) : (
          <Bar data={progressData} options={options} />
        )}
      </div>
    </div>
  );
}

export default ProgressChart;