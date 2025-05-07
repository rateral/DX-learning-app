import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useUser } from '../contexts/UserContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function ProgressChart({ courses, studySessions }) {
  const { currentUser } = useUser();
  const [chartType, setChartType] = useState('progress');
  
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
  
  // 学習時間データの集計
  const courseTimeMap = new Map();
  courses.forEach(course => {
    courseTimeMap.set(course.id, {
      title: course.title,
      totalMinutes: 0
    });
  });
  
  studySessions.forEach(session => {
    if (courseTimeMap.has(session.courseId)) {
      const courseData = courseTimeMap.get(session.courseId);
      courseData.totalMinutes += session.duration;
      courseTimeMap.set(session.courseId, courseData);
    }
  });
  
  // 学習時間チャートデータ
  const timeData = {
    labels: [...courseTimeMap.values()].map(data => data.title),
    datasets: [
      {
        label: '学習時間 (分)',
        data: [...courseTimeMap.values()].map(data => data.totalMinutes),
        backgroundColor: 'rgba(76, 175, 80, 0.6)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1
      }
    ]
  };
  
  // 過去7日間の学習時間
  const [dailyData, setDailyData] = useState({
    labels: [],
    datasets: [
      {
        label: '日別学習時間 (分)',
        data: [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  });
  
  useEffect(() => {
    // 過去7日間のデータを準備
    const last7Days = [];
    const dailyMinutes = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      last7Days.push(dateStr);
      
      // その日の合計学習時間を計算
      const todayTotal = studySessions.reduce((total, session) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        
        if (sessionDate.getTime() === date.getTime()) {
          return total + session.duration;
        }
        return total;
      }, 0);
      
      dailyMinutes.push(todayTotal);
    }
    
    setDailyData({
      labels: last7Days,
      datasets: [
        {
          label: '日別学習時間 (分)',
          data: dailyMinutes,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    });
  }, [studySessions]);
  
  // カテゴリ別割合
  const categoryData = {
    labels: ['プログラミング', '語学', '数学', '科学', 'その他'],
    datasets: [
      {
        label: 'カテゴリ別コース数',
        data: [
          courses.filter(c => c.category === 'programming').length,
          courses.filter(c => c.category === 'language').length,
          courses.filter(c => c.category === 'math').length,
          courses.filter(c => c.category === 'science').length,
          courses.filter(c => c.category === 'other').length
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  // チャートタイトル
  const getChartTitle = () => {
    return chartType === 'progress' ? 'コース別進捗率' : 
           chartType === 'time' ? 'コース別学習時間' :
           chartType === 'daily' ? '過去7日間の学習時間' : 'カテゴリ別コース数';
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
        display: true,
        text: getChartTitle()
      }
    }
  };
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setChartType('progress')}
          style={{ 
            marginRight: '10px', 
            backgroundColor: chartType === 'progress' ? '#4caf50' : '#ccc',
            color: 'white' 
          }}
        >
          進捗率
        </button>
        <button 
          onClick={() => setChartType('time')}
          style={{ 
            marginRight: '10px', 
            backgroundColor: chartType === 'time' ? '#4caf50' : '#ccc',
            color: 'white' 
          }}
        >
          学習時間
        </button>
        <button 
          onClick={() => setChartType('daily')}
          style={{ 
            marginRight: '10px', 
            backgroundColor: chartType === 'daily' ? '#4caf50' : '#ccc',
            color: 'white' 
          }}
        >
          日別学習時間
        </button>
        <button 
          onClick={() => setChartType('category')}
          style={{ 
            backgroundColor: chartType === 'category' ? '#4caf50' : '#ccc',
            color: 'white' 
          }}
        >
          カテゴリ
        </button>
      </div>
      
      <div className="chart-container">
        {courses.length === 0 ? (
          <p>データがありません。コースを追加してください。</p>
        ) : chartType === 'progress' ? (
          <Bar data={progressData} options={options} />
        ) : chartType === 'time' && studySessions.length > 0 ? (
          <Bar data={timeData} options={options} />
        ) : chartType === 'daily' && studySessions.length > 0 ? (
          <Line data={dailyData} options={options} />
        ) : chartType === 'category' ? (
          <Pie data={categoryData} options={options} />
        ) : (
          <p>学習記録がありません。学習時間を記録してください。</p>
        )}
      </div>
    </div>
  );
}

export default ProgressChart;