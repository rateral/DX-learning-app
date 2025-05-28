import React, { useEffect, useState } from 'react';
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
import { useUser } from '../contexts/UserContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function ProgressChart({ courses }) {
  const { currentUser } = useUser();
  
  // コース進捗データ
  const progressData = {
    labels: courses.map(course => course.title),
    datasets: [
      {
        label: '進捗率 (%)',
        data: courses.map(course => course.progress),
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