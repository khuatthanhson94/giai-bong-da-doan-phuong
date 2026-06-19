import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import api from '../../api/client';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData);
  }, []);

  if (!data) return <div>Đang tải...</div>;

  const chartData = {
    labels: ['Đã đá', 'Chưa đá'],
    datasets: [{
      data: [data.finishedMatches, data.scheduledMatches],
      backgroundColor: ['#0066CC', '#00A651'],
    }],
  };

  const stats = [
    { label: 'Đội bóng', value: data.totalTeams, color: 'bg-primary' },
    { label: 'Cầu thủ', value: data.totalPlayers, color: 'bg-youth' },
    { label: 'Tổng trận', value: data.totalMatches, color: 'bg-blue-400' },
    { label: 'Đã đá', value: data.finishedMatches, color: 'bg-green-500' },
    { label: 'Chưa đá', value: data.scheduledMatches, color: 'bg-orange-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`w-10 h-10 ${s.color} rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
              {s.value}
            </div>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="font-bold mb-4">Thống kê trận đấu</h3>
          <div className="max-w-xs mx-auto"><Doughnut data={chartData} /></div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold mb-4">Tin tức mới</h3>
          {data.recentNews.map((n) => (
            <p key={n.id} className="text-sm py-2 border-b">{n.title}</p>
          ))}
        </div>
      </div>

      <div className="card p-6 mt-8">
        <h3 className="font-bold mb-4">Nhật ký thao tác</h3>
        <div className="max-h-60 overflow-y-auto">
          {data.logs.map((l) => (
            <div key={l.id} className="text-sm py-2 border-b flex justify-between">
              <span>{l.username}: {l.action}</span>
              <span className="text-gray-400">{new Date(l.created_at).toLocaleString('vi-VN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
