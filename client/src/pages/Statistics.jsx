import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function TopList({ title, items, valueKey, color }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-primary mb-4">{title}</h3>
      {items.slice(0, 5).map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0">
          <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
          {p.photo ? (
            <img src={getFullUrl(p.photo)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold flex-shrink-0">
              {p.name?.charAt(0) || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{p.name}</p>
            <p className="text-xs text-gray-500 truncate">{p.team_name}</p>
          </div>
          <span className="font-bold text-sm flex-shrink-0" style={{ color }}>{p[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/statistics').then(setStats);
  }, []);

  if (!stats) return <div className="text-center py-20">Đang tải...</div>;

  const goalsChart = {
    labels: stats.topScorers.slice(0, 8).map((p) => p.name.split(' ').pop()),
    datasets: [{
      label: 'Bàn thắng',
      data: stats.topScorers.slice(0, 8).map((p) => p.goals),
      backgroundColor: '#0066CC',
      borderRadius: 6,
    }],
  };

  const teamGoalsChart = {
    labels: stats.teamGoals.map((t) => t.name.split(' ').slice(-2).join(' ')),
    datasets: [{
      label: 'Tổng bàn thắng',
      data: stats.teamGoals.map((t) => t.total_goals),
      backgroundColor: '#00A651',
      borderRadius: 6,
    }],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Thống kê</h1>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="font-bold text-primary mb-4">Top ghi bàn</h3>
          <div className="h-64 sm:h-80 relative">
            <Bar data={goalsChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-primary mb-4">Đội ghi nhiều bàn nhất</h3>
          <div className="h-64 sm:h-80 relative">
            <Bar data={teamGoalsChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TopList title="Top ghi bàn" items={stats.topScorers} valueKey="goals" color="#0066CC" />
        <TopList title="Top thẻ vàng" items={stats.topYellow} valueKey="yellow_cards" color="#EAB308" />
        <TopList title="Top thẻ đỏ" items={stats.topRed} valueKey="red_cards" color="#EF4444" />
      </div>

      {stats.bestDefense?.[0] && (
        <div className="card p-6 mt-8 text-center">
          <h3 className="font-bold text-primary mb-2">🛡️ Đội thủng lưới ít nhất</h3>
          <p className="text-2xl font-bold">{stats.bestDefense[0].name}</p>
          <p className="text-gray-500">{stats.bestDefense[0].goals_against} bàn thua</p>
        </div>
      )}
    </div>
  );
}
