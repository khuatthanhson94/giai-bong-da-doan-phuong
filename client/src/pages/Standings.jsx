import { useEffect, useState } from 'react';
import api from '../api/client';
import StandingsTable from '../components/StandingsTable';
import * as XLSX from 'xlsx';

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

  const exportExcel = () => {
    const dataRows = [];
    
    groupNames.forEach((groupName) => {
      // Add group title
      dataRows.push([groupName]);
      // Add headers
      dataRows.push(['Hạng', 'Đội bóng', 'Trận', 'Thắng', 'Hòa', 'Thua', 'Hiệu số', 'Điểm']);
      // Add teams
      grouped[groupName].forEach((t, index) => {
        dataRows.push([
          index + 1,
          t.name,
          t.played || 0,
          t.won || 0,
          t.drawn || 0,
          t.lost || 0,
          t.goal_diff || 0,
          t.points || 0
        ]);
      });
      // Add empty separator row
      dataRows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng xếp hạng');
    XLSX.writeFile(wb, 'bang_xep_hang_giai_dau.xlsx');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-primary">Bảng xếp hạng</h1>
        <button
          onClick={exportExcel}
          className="btn-outline text-sm flex items-center gap-1 py-2 px-3"
        >
          📥 Xuất Excel
        </button>
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
