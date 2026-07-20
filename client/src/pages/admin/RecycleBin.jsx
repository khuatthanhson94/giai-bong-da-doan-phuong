import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function RecycleBin() {
  const [data, setData] = useState({
    teams: [],
    players: [],
    matches: [],
    groups: [],
    news: [],
    sponsors: [],
    seasons: [],
    tournaments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset selection on tab change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  // Reset selection when data loads
  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  const handleSelectAll = (e) => {
    const currentItems = data[activeTab] || [];
    if (e.target.checked) {
      setSelectedIds(currentItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục ${selectedIds.length} mục đã chọn không?`)) return;
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    let restoredCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const id of selectedIds) {
      try {
        const item = data[activeTab].find(x => x.id === id);
        const name = item ? (item.name || item.title || `${activeTab}-${id}`) : id;
        await api.post('/recyclebin/restore', { type: activeTab, id });
        restoredCount++;
      } catch (err) {
        failedCount++;
        lastError = err.message;
      }
    }

    if (restoredCount > 0) {
      setSuccess(`Khôi phục thành công ${restoredCount} mục.`);
    }
    if (failedCount > 0) {
      setError(`Có ${failedCount} mục khôi phục thất bại. Lỗi: ${lastError}`);
    }
    
    loadRecycleBin();
  };

  const handleBulkPurge = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`CẢNH BÁO CỰC KỲ NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedIds.length} mục đã chọn không? Thao tác này KHÔNG THỂ khôi phục và sẽ xóa vĩnh viễn dữ liệu liên quan.`)) return;
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    let purgedCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const id of selectedIds) {
      try {
        const item = data[activeTab].find(x => x.id === id);
        const name = item ? (item.name || item.title || `${activeTab}-${id}`) : id;
        await api.post('/recyclebin/purge', { type: activeTab, id });
        purgedCount++;
      } catch (err) {
        failedCount++;
        lastError = err.message;
      }
    }

    if (purgedCount > 0) {
      setSuccess(`Đã xóa vĩnh viễn thành công ${purgedCount} mục.`);
    }
    if (failedCount > 0) {
      setError(`Có ${failedCount} mục xóa thất bại. Lỗi: ${lastError}`);
    }
    
    loadRecycleBin();
  };

  const loadRecycleBin = () => {
    setLoading(true);
    api.get('/recyclebin')
      .then(res => {
        setData(res || {
          teams: [],
          players: [],
          matches: [],
          groups: [],
          news: [],
          sponsors: [],
          seasons: [],
          tournaments: []
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const handleRestore = async (type, id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục mục "${name}" này không?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/recyclebin/restore', { type, id });
      setSuccess(`Khôi phục thành công: ${name}`);
      loadRecycleBin();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePurge = async (type, id, name) => {
    if (!window.confirm(`CẢNH BÁO CỰC KỲ QUAN TRỌNG: Bạn có chắc chắn muốn xóa vĩnh viễn "${name}" không? Thao tác này KHÔNG THỂ KHÔI PHỤC và sẽ xóa vĩnh viễn tất cả các bản ghi liên đới.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/recyclebin/purge', { type, id });
      setSuccess(`Đã xóa vĩnh viễn: ${name}`);
      loadRecycleBin();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  const tabs = [
    { key: 'teams', label: 'Đội bóng', count: data.teams.length },
    { key: 'players', label: 'Cầu thủ', count: data.players.length },
    { key: 'matches', label: 'Trận đấu', count: data.matches.length },
    { key: 'groups', label: 'Bảng đấu', count: data.groups.length },
    { key: 'news', label: 'Tin tức', count: data.news.length },
    { key: 'sponsors', label: 'Nhà tài trợ', count: data.sponsors.length },
    { key: 'seasons', label: 'Mùa giải', count: data.seasons.length },
    { key: 'tournaments', label: 'Giải đấu', count: data.tournaments.length }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Thùng rác hệ thống (Recycle Bin)</h1>
        <p className="text-sm text-gray-500 mt-1">Khôi phục hoặc xóa vĩnh viễn các mục dữ liệu đã xóa tạm thời. Bản ghi quá 30 ngày sẽ tự động bị xóa vĩnh viễn.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm font-medium border border-green-200">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === t.key 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 animate-fade-in">
          <span className="text-sm font-bold text-gray-700">Đã chọn: <span className="text-primary font-black">{selectedIds.length}</span> mục</span>
          <div className="flex gap-3">
            <button 
              onClick={handleBulkRestore}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer"
            >
              Khôi phục các mục đã chọn
            </button>
            <button 
              onClick={handleBulkPurge}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer"
            >
              Xóa vĩnh viễn các mục đã chọn
            </button>
          </div>
        </div>
      )}

      {/* Data tables */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center p-12 text-gray-500">Đang tải dữ liệu thùng rác...</div>
        ) : (
          <div>
            {activeTab === 'teams' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.teams.length > 0 && selectedIds.length === data.teams.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên đội</th>
                      <th className="p-4">Huấn luyện viên</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.teams.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.teams.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => handleSelectItem(t.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{t.name}</td>
                          <td className="p-4 text-gray-600">{t.coach || 'Không rõ'}</td>
                          <td className="p-4 text-gray-500">{formatTime(t.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('teams', t.id, t.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('teams', t.id, t.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.players.length > 0 && selectedIds.length === data.players.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên cầu thủ</th>
                      <th className="p-4">Đội bóng</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.players.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.players.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleSelectItem(p.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{p.name} (Số {p.jersey_number})</td>
                          <td className="p-4 text-gray-600">{p.team_name || 'Không rõ'}</td>
                          <td className="p-4 text-gray-500">{formatTime(p.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('players', p.id, p.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('players', p.id, p.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.matches.length > 0 && selectedIds.length === data.matches.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Vòng đấu</th>
                      <th className="p-4">Cặp đấu</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.matches.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.matches.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => handleSelectItem(m.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{m.round}</td>
                          <td className="p-4 text-gray-600">{m.team_a_name || 'Đội A'} vs {m.team_b_name || 'Đội B'}</td>
                          <td className="p-4 text-gray-500">{formatTime(m.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('matches', m.id, `${m.team_a_name} vs ${m.team_b_name}`)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('matches', m.id, `${m.team_a_name} vs ${m.team_b_name}`)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.groups.length > 0 && selectedIds.length === data.groups.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên bảng</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.groups.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.groups.map((g) => (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(g.id)} onChange={() => handleSelectItem(g.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{g.name}</td>
                          <td className="p-4 text-gray-500">{formatTime(g.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('groups', g.id, g.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('groups', g.id, g.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.news.length > 0 && selectedIds.length === data.news.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tiêu đề tin tức</th>
                      <th className="p-4">Thể loại</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.news.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.news.map((n) => (
                        <tr key={n.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => handleSelectItem(n.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800 max-w-xs truncate">{n.title}</td>
                          <td className="p-4 text-gray-600">{n.category}</td>
                          <td className="p-4 text-gray-500">{formatTime(n.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('news', n.id, n.title)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('news', n.id, n.title)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'sponsors' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.sponsors.length > 0 && selectedIds.length === data.sponsors.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên nhà tài trợ</th>
                      <th className="p-4">Hạng</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.sponsors.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.sponsors.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectItem(s.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{s.name}</td>
                          <td className="p-4 text-gray-600 font-semibold">{s.tier}</td>
                          <td className="p-4 text-gray-500">{formatTime(s.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('sponsors', s.id, s.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('sponsors', s.id, s.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.seasons.length > 0 && selectedIds.length === data.seasons.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên Mùa giải</th>
                      <th className="p-4">Năm</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.seasons.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.seasons.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectItem(s.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{s.name}</td>
                          <td className="p-4 text-gray-600">{s.year}</td>
                          <td className="p-4 text-gray-500">{formatTime(s.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('seasons', s.id, s.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('seasons', s.id, s.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'tournaments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={data.tournaments.length > 0 && selectedIds.length === data.tournaments.length} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></th>
                      <th className="p-4">Tên Giải đấu</th>
                      <th className="p-4">Mùa giải</th>
                      <th className="p-4">Thời điểm xóa</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.tournaments.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-500">Thùng rác trống.</td></tr>
                    ) : (
                      data.tournaments.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-4 w-12"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => handleSelectItem(t.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /></td>
                          <td className="p-4 font-bold text-gray-800">{t.name}</td>
                          <td className="p-4 text-gray-600">{t.season_name}</td>
                          <td className="p-4 text-gray-500">{formatTime(t.deleted_at)}</td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => handleRestore('tournaments', t.id, t.name)} className="text-primary hover:text-primary-dark font-semibold">Khôi phục</button>
                            <button onClick={() => handlePurge('tournaments', t.id, t.name)} className="text-red-500 hover:text-red-700 font-semibold">Xóa vĩnh viễn</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
);
}
