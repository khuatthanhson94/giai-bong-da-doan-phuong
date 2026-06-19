import { useEffect, useState } from 'react';
import api from '../api/client';
import StandingsTable from '../components/StandingsTable';

export default function Standings() {
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    api.get('/standings').then(setStandings);
  }, []);

  const grouped = standings.reduce((acc, team) => {
    const groupName = team.group_name || 'Đội chưa phân bảng';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(team);
    return acc;
  }, {});

  const groupNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-primary">Bảng xếp hạng</h1>
        <a href="/api/export/standings" className="btn-outline text-sm" download>
          Xuất Excel (CSV)
        </a>
      </div>

      <div className="space-y-8">
        {groupNames.map((groupName) => (
          <div key={groupName} className="card p-4 md:p-6">
            <h2 className="text-xl font-bold text-primary mb-4">{groupName}</h2>
            <StandingsTable standings={grouped[groupName]} />
          </div>
        ))}
        {standings.length === 0 && (
          <p className="text-center text-gray-500 py-12">Chưa có dữ liệu bảng xếp hạng</p>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Bảng xếp hạng tự động cập nhật sau mỗi trận đấu được công bố
      </p>
    </div>
  );
}
