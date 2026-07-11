import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function Tournaments() {
  const [seasons, setSeasons] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mode state: 'list' or 'wizard'
  const [viewMode, setViewMode] = useState('list');

  // Normal CRUD Form state
  const [editId, setEditId] = useState(null);
  const [seasonId, setSeasonId] = useState('');
  const [name, setName] = useState('');
  const [format, setFormat] = useState('group_knockout');
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [advanceCount, setAdvanceCount] = useState(2);
  const [status, setStatus] = useState('draft');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizSeasonId, setWizSeasonId] = useState('');
  const [wizNewSeasonName, setWizNewSeasonName] = useState('');
  const [wizNewSeasonYear, setWizNewSeasonYear] = useState(new Date().getFullYear());
  
  const [wizTourId, setWizTourId] = useState(null);
  const [wizTourName, setWizTourName] = useState('');
  const [wizTourFormat, setWizTourFormat] = useState('group_knockout');
  const [wizPointsWin, setWizPointsWin] = useState(3);
  const [wizPointsDraw, setWizPointsDraw] = useState(1);
  const [wizPointsLoss, setWizPointsLoss] = useState(0);
  const [wizAdvanceCount, setWizAdvanceCount] = useState(2);
  const [wizTourLogo, setWizTourLogo] = useState('');
  const [wizTourBanner, setWizTourBanner] = useState('');

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const baseUrl = API_BASE || window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setLogo(res.url);
    } catch (err) {
      setError('Tải logo lên thất bại: ' + err.message);
    }
  };

  const handleUploadBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setBanner(res.url);
    } catch (err) {
      setError('Tải banner lên thất bại: ' + err.message);
    }
  };

  const handleUploadWizLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setWizTourLogo(res.url);
    } catch (err) {
      setError('Tải logo lên thất bại: ' + err.message);
    }
  };

  const handleUploadWizBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setWizTourBanner(res.url);
    } catch (err) {
      setError('Tải banner lên thất bại: ' + err.message);
    }
  };

  const [wizSelectedTeams, setWizSelectedTeams] = useState([]);
  const [wizNewTeamName, setWizNewTeamName] = useState('');

  const [wizGroups, setWizGroups] = useState([]); // Array of { name: 'Bảng A', teams: [] }
  const [wizNewGroupName, setWizNewGroupName] = useState('');
  
  const [wizMatches, setWizMatches] = useState([]);
  
  const [wizKnockoutConfig, setWizKnockoutConfig] = useState({
    startingRound: 'Tứ kết',
    startingMatches: [
      { id: 'Q1', home: { type: 'rank', groupId: '', rank: 1 }, away: { type: 'rank', groupId: '', rank: 2 } },
      { id: 'Q2', home: { type: 'rank', groupId: '', rank: 1 }, away: { type: 'rank', groupId: '', rank: 2 } },
      { id: 'Q3', home: { type: 'rank', groupId: '', rank: 1 }, away: { type: 'rank', groupId: '', rank: 2 } },
      { id: 'Q4', home: { type: 'rank', groupId: '', rank: 1 }, away: { type: 'rank', groupId: '', rank: 2 } }
    ],
    nextRounds: [
      { round: 'Bán kết', matches: [
        { id: 'S1', home: { type: 'match', matchId: 'Q1' }, away: { type: 'match', matchId: 'Q2' } },
        { id: 'S2', home: { type: 'match', matchId: 'Q3' }, away: { type: 'match', matchId: 'Q4' } }
      ]},
      { round: 'Chung kết', matches: [
        { id: 'F1', home: { type: 'match', matchId: 'S1' }, away: { type: 'match', matchId: 'S2' } }
      ]}
    ]
  });

  const [wizSelectedSponsors, setWizSelectedSponsors] = useState([]);
  const [wizNewSponsorName, setWizNewSponsorName] = useState('');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const s = await api.get('/seasons');
      setSeasons(s || []);
      if (s && s.length > 0) {
        setSeasonId(s[0].id);
        setWizSeasonId(s[0].id);
      }
      
      const t = await api.get('/tournaments');
      setTournaments(t || []);
      
      // Load all available teams and sponsors for step 3 and 7
      const tm = await api.get('/teams');
      setTeams(tm || []);
      
      const sp = await api.get('/sponsors');
      setSponsors(sp || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setFormat('group_knockout');
    setPointsWin(3);
    setPointsDraw(1);
    setPointsLoss(0);
    setAdvanceCount(2);
    setStatus('draft');
    setLogo('');
    setBanner('');
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setSeasonId(t.season_id);
    setName(t.name);
    setFormat(t.format);
    setPointsWin(t.points_win);
    setPointsDraw(t.points_draw);
    setPointsLoss(t.points_loss);
    setAdvanceCount(t.advance_count);
    setStatus(t.status);
    setLogo(t.logo || '');
    setBanner(t.banner || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const body = {
      season_id: Number(seasonId),
      name,
      format,
      points_win: Number(pointsWin),
      points_draw: Number(pointsDraw),
      points_loss: Number(pointsLoss),
      advance_count: Number(advanceCount),
      status,
      logo,
      banner
    };

    try {
      if (editId) {
        await api.put(`/tournaments/${editId}`, body);
        setSuccess('Cập nhật giải đấu thành công!');
      } else {
        await api.post('/tournaments', body);
        setSuccess('Tạo giải đấu mới thành công!');
      }
      resetForm();
      loadInitialData();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn đưa giải đấu này vào thùng rác? Tất cả các trận đấu, bảng đấu, đội bóng trực thuộc giải đấu này cũng sẽ tạm thời bị ẩn.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/tournaments/${id}`);
      setSuccess('Đã đưa giải đấu vào thùng rác!');
      loadInitialData();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==================== WIZARD STEPS LOGIC ====================
  
  // Step 1: Season setup
  const wizSubmitSeason = async () => {
    setError('');
    if (!wizSeasonId && !wizNewSeasonName) {
      setError('Vui lòng chọn mùa giải hiện tại hoặc nhập mùa giải mới');
      return;
    }

    try {
      let finalSeasonId = wizSeasonId;
      if (wizNewSeasonName) {
        const res = await api.post('/seasons', { name: wizNewSeasonName, year: Number(wizNewSeasonYear), status: 'active' });
        finalSeasonId = res.id;
        setWizSeasonId(res.id);
        setSuccess('Đã khởi tạo mùa giải mới: ' + wizNewSeasonName);
      }
      setWizardStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  // Step 2: Tournament config
  const wizSubmitTournament = async () => {
    setError('');
    if (!wizTourName) {
      setError('Tên giải đấu không được bỏ trống');
      return;
    }

    try {
      const res = await api.post('/tournaments', {
        season_id: Number(wizSeasonId),
        name: wizTourName,
        format: wizTourFormat,
        points_win: Number(wizPointsWin),
        points_draw: Number(wizPointsDraw),
        points_loss: Number(wizPointsLoss),
        advance_count: Number(wizAdvanceCount),
        status: 'draft',
        logo: wizTourLogo,
        banner: wizTourBanner
      });
      setWizTourId(res.id);
      setSuccess('Đã tạo dự thảo giải đấu: ' + wizTourName);
      setWizardStep(3);
    } catch (err) {
      setError(err.message);
    }
  };

  // Step 3: Add teams to tournament
  const wizCreateNewTeam = async () => {
    if (!wizNewTeamName) return;
    setError('');
    try {
      const res = await api.post('/teams', { name: wizNewTeamName, tournament_id: Number(wizTourId) });
      setTeams(prev => [...prev, { id: res.id, name: wizNewTeamName }]);
      setWizSelectedTeams(prev => [...prev, res.id]);
      setWizNewTeamName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const wizSubmitTeams = async () => {
    if (wizSelectedTeams.length < 2) {
      setError('Vui lòng chọn tối thiểu 2 đội bóng để tiếp tục');
      return;
    }
    // Update selected teams' tournament_id (handled automatically by body injection in request client, but let's confirm association)
    setWizardStep(4);
  };

  // Step 4: Divide groups
  const wizAddGroup = () => {
    if (!wizNewGroupName) return;
    setWizGroups(prev => [...prev, { id: Date.now(), name: wizNewGroupName, teams: [] }]);
    setWizNewGroupName('');
  };

  const wizAssignTeamToGroup = (groupId, teamId) => {
    setWizGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        if (g.teams.includes(teamId)) return g;
        return { ...g, teams: [...g.teams, teamId] };
      }
      // Remove from other groups
      return { ...g, teams: g.teams.filter(t => t !== teamId) };
    }));
  };

  const wizSubmitGroups = async () => {
    setError('');
    try {
      for (const g of wizGroups) {
        const groupRes = await api.post('/groups', { name: g.name, tournament_id: Number(wizTourId) });
        const gId = groupRes.id;
        // Assign teams to group
        await api.post(`/groups/${gId}/teams`, { teamIds: g.teams });
      }
      setSuccess('Đã phân chia các bảng đấu thành công');
      setWizardStep(5);
    } catch (err) {
      setError(err.message);
    }
  };

  // Step 5: Generate schedule
  const wizGenerateGroupSchedule = async () => {
    setError('');
    try {
      await api.post('/matches/generate-group-schedule', { tournament_id: Number(wizTourId) });
      const matchesData = await api.get(`/matches?tournament_id=${wizTourId}`);
      setWizMatches(matchesData || []);
      setSuccess('Đã lên lịch vòng bảng tự động thành công');
    } catch (err) {
      setError(err.message);
    }
  };

  const wizSubmitSchedule = () => {
    if (wizMatches.length === 0 && wizTourFormat !== 'knockout') {
      setError('Hãy tạo lịch thi đấu vòng bảng trước khi tiếp tục');
      return;
    }
    setWizardStep(6);
  };

  // Step 6: Generate knockout brackets
  const wizGenerateKnockout = async () => {
    setError('');
    try {
      await api.post('/matches/generate-knockout', {
        tournament_id: Number(wizTourId),
        config: wizKnockoutConfig
      });
      setSuccess('Đã tạo sơ đồ nhánh đấu Knockout thành công');
      setWizardStep(7);
    } catch (err) {
      setError(err.message);
    }
  };

  // Step 7: Associate sponsors
  const wizCreateNewSponsor = async () => {
    if (!wizNewSponsorName) return;
    setError('');
    try {
      const res = await api.post('/sponsors', { name: wizNewSponsorName, tier: 'general', tournament_id: Number(wizTourId) });
      setSponsors(prev => [...prev, { id: res.id, name: wizNewSponsorName }]);
      setWizSelectedSponsors(prev => [...prev, res.id]);
      setWizNewSponsorName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const wizSubmitSponsors = () => {
    setWizardStep(8);
  };

  // Step 8: Confirm and Publish
  const wizPublishTournament = async () => {
    setError('');
    try {
      await api.put(`/tournaments/${wizTourId}`, { name: wizTourName, status: 'active' });
      setSuccess('🎉 Xin chúc mừng! Giải đấu đã được kích hoạt và công bố rộng rãi!');
      setTimeout(() => {
        // Switch to the created tournament
        localStorage.setItem("v3_selected_tournament_id", wizTourId);
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Giải đấu</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'list' 
              ? 'Tạo mới hoặc quản lý cấu hình các giải đấu thể thao Đoàn phường' 
              : 'Thiết lập giải đấu chuyên nghiệp qua bộ Wizard 8 bước'}
          </p>
        </div>
        <button
          onClick={() => {
            setViewMode(viewMode === 'list' ? 'wizard' : 'list');
            setWizardStep(1);
          }}
          className="bg-youth text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-youth/90 transition shadow-sm cursor-pointer"
        >
          {viewMode === 'list' ? '🚀 Tạo giải đấu (Wizard 8 Bước)' : '← Danh sách giải đấu'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm font-medium border border-green-200">{success}</div>}

      {viewMode === 'list' ? (
        // ==================== LIST VIEW (CRUD) ====================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editId ? 'Chỉnh sửa Giải đấu' : 'Thêm Giải đấu mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thuộc Mùa giải</label>
                <select
                  value={seasonId}
                  onChange={e => setSeasonId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                >
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Giải đấu</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giải Bóng đá Nam 2026"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thể thức thi đấu</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                >
                  <option value="group_knockout">Chia bảng + Loại trực tiếp</option>
                  <option value="knockout">Đấu loại trực tiếp</option>
                  <option value="round_robin">Đá vòng tròn tính điểm</option>
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Điểm Thắng</label>
                  <input
                    type="number"
                    value={pointsWin}
                    onChange={e => setPointsWin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Điểm Hòa</label>
                  <input
                    type="number"
                    value={pointsDraw}
                    onChange={e => setPointsDraw(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Điểm Thua</label>
                  <input
                    type="number"
                    value={pointsLoss}
                    onChange={e => setPointsLoss(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số đội đi tiếp mỗi bảng</label>
                <input
                  type="number"
                  value={advanceCount}
                  onChange={e => setAdvanceCount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="active">Đang diễn ra (Active)</option>
                  <option value="finished">Đã kết thúc (Finished)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo Giải đấu (Tùy chọn)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Đường dẫn logo hoặc tải lên..."
                    value={logo}
                    onChange={e => setLogo(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                  />
                  <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none">
                    Tải lên
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  </label>
                </div>
                {logo && (
                  <img src={getFullUrl(logo)} alt="Logo Preview" className="w-16 h-16 object-contain border rounded mt-2 p-1 bg-white" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Giải đấu (Tùy chọn)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Đường dẫn banner hoặc tải lên..."
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                  />
                  <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none">
                    Tải lên
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} />
                  </label>
                </div>
                {banner && (
                  <img src={getFullUrl(banner)} alt="Banner Preview" className="w-32 h-16 object-cover border rounded mt-2 p-1 bg-white" />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark cursor-pointer transition"
                >
                  {editId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Đang tải danh sách giải đấu...</div>
            ) : tournaments.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Chưa có giải đấu nào được khởi tạo.</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 text-sm font-semibold border-b">
                    <tr>
                      <th className="p-4">Tên Giải đấu</th>
                      <th className="p-4">Mùa giải</th>
                      <th className="p-4">Thể thức</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {tournaments.map((t) => {
                      const parentSeason = seasons.find(s => s.id === t.season_id);
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-semibold text-gray-800">{t.name}</td>
                          <td className="p-4 text-gray-600">{parentSeason?.name || 'Mùa mặc định'}</td>
                          <td className="p-4 text-gray-600">
                            {t.format === 'group_knockout' ? 'Chia bảng + Knockout' : t.format === 'knockout' ? 'Loại trực tiếp' : 'Vòng tròn'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'finished' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {t.status === 'active' ? 'Hoạt động' : t.status === 'finished' ? 'Đã kết thúc' : 'Bản nháp'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(t)}
                              className="text-primary hover:text-primary-dark font-semibold transition"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="text-red-500 hover:text-red-700 font-semibold transition"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==================== 8-STEP TOURNAMENT WIZARD VIEW ====================
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="bg-gray-50 border-b p-4 flex justify-between items-center text-xs font-semibold text-gray-500 divide-x overflow-x-auto">
            {[
              '1. Chọn Mùa', '2. Cấu hình giải', '3. Đội tham gia', '4. Chia bảng',
              '5. Xếp lịch đấu', '6. Nhánh Knockout', '7. Nhà tài trợ', '8. Kích hoạt'
            ].map((name, i) => (
              <div
                key={name}
                className={`flex-1 text-center py-2 px-1 ${
                  wizardStep === i + 1 ? 'text-primary font-bold bg-blue-50/50' : wizardStep > i + 1 ? 'text-green-600' : ''
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Step Body */}
          <div className="p-8 space-y-6">
            
            {/* Step 1: Season selection */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 1: Chọn hoặc Tạo Mùa giải</h3>
                <p className="text-sm text-gray-500">Mọi giải đấu thuộc Đoàn phường phải nằm trong một mùa giải cụ thể.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mùa giải hiện tại</label>
                    <select
                      value={wizSeasonId}
                      onChange={e => {
                        setWizSeasonId(e.target.value);
                        setWizNewSeasonName(''); // Clear new season form if selected existing
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none"
                    >
                      <option value="">-- Tạo mùa giải mới bên dưới --</option>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
                    </select>
                  </div>

                  <div className="text-center font-bold text-gray-400 my-2">— HOẶC TẠO MỚI —</div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-dashed">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên Mùa giải mới</label>
                      <input
                        type="text"
                        placeholder="Mùa giải 2027"
                        value={wizNewSeasonName}
                        onChange={e => {
                          setWizNewSeasonName(e.target.value);
                          setWizSeasonId(''); // Clear dropdown choice
                        }}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Năm tổ chức</label>
                      <input
                        type="number"
                        value={wizNewSeasonYear}
                        onChange={e => setWizNewSeasonYear(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={wizSubmitSeason}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Tournament configs */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 2: Cấu hình thông tin cơ bản giải đấu</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên giải đấu</label>
                    <input
                      type="text"
                      required
                      placeholder="Giải bóng đá Thanh niên Hè 2026"
                      value={wizTourName}
                      onChange={e => setWizTourName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thể thức giải đấu</label>
                    <select
                      value={wizTourFormat}
                      onChange={e => setWizTourFormat(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none"
                    >
                      <option value="group_knockout">Vòng bảng + Knockout loại trực tiếp</option>
                      <option value="knockout">Đấu loại trực tiếp từ đầu</option>
                      <option value="round_robin">Đá vòng tròn tính điểm (League)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số đội lọt qua vòng bảng</label>
                    <input
                      type="number"
                      disabled={wizTourFormat !== 'group_knockout'}
                      value={wizAdvanceCount}
                      onChange={e => setWizAdvanceCount(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-gray-50 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 col-span-2 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 text-center">Điểm thắng</label>
                      <input
                        type="number"
                        value={wizPointsWin}
                        onChange={e => setWizPointsWin(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 text-center">Điểm hòa</label>
                      <input
                        type="number"
                        value={wizPointsDraw}
                        onChange={e => setWizPointsDraw(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 text-center">Điểm thua</label>
                      <input
                        type="number"
                        value={wizPointsLoss}
                        onChange={e => setWizPointsLoss(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-1.5 text-center bg-white"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo Giải đấu (Tùy chọn)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Đường dẫn logo hoặc tải lên..."
                          value={wizTourLogo}
                          onChange={e => setWizTourLogo(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                        />
                        <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none">
                          Tải lên
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadWizLogo} />
                        </label>
                      </div>
                      {wizTourLogo && (
                        <img src={getFullUrl(wizTourLogo)} alt="Logo Preview" className="w-16 h-16 object-contain border rounded mt-2 p-1 bg-white" />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Banner Giải đấu (Tùy chọn)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Đường dẫn banner hoặc tải lên..."
                          value={wizTourBanner}
                          onChange={e => setWizTourBanner(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
                        />
                        <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none">
                          Tải lên
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadWizBanner} />
                        </label>
                      </div>
                      {wizTourBanner && (
                        <img src={getFullUrl(wizTourBanner)} alt="Banner Preview" className="w-32 h-16 object-cover border rounded mt-2 p-1 bg-white" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <button onClick={() => setWizardStep(1)} className="text-gray-600 hover:underline">Quay lại</button>
                  <button
                    onClick={wizSubmitTournament}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tạo giải đấu & Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Select teams */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 3: Đội bóng tham gia giải đấu</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên đội bóng mới cần thêm..."
                    value={wizNewTeamName}
                    onChange={e => setWizNewTeamName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 bg-white"
                  />
                  <button
                    onClick={wizCreateNewTeam}
                    className="bg-youth text-white px-4 py-2 rounded-lg font-semibold hover:bg-youth/90 cursor-pointer"
                  >
                    + Tạo đội
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn các đội bóng tham dự giải này:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-4 rounded-lg">
                    {teams.map(t => {
                      const isChecked = wizSelectedTeams.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 border rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setWizSelectedTeams(prev => prev.filter(id => id !== t.id));
                              } else {
                                setWizSelectedTeams(prev => [...prev, t.id]);
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <div className="text-sm text-gray-500 font-semibold">{wizSelectedTeams.length} đội đã chọn</div>
                  <button
                    onClick={wizSubmitTeams}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Divide groups */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 4: Chia bảng đấu</h3>
                <p className="text-sm text-gray-500">Thiết lập các bảng đấu (ví dụ: Bảng A, Bảng B) và gán đội vào bảng tương ứng.</p>

                {wizTourFormat === 'knockout' ? (
                  <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                    Cấu hình giải đấu Loại trực tiếp không cần chia bảng. Bấm Tiếp tục.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tên bảng mới (Ví dụ: Bảng A)"
                        value={wizNewGroupName}
                        onChange={e => setWizNewGroupName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg p-2"
                      />
                      <button
                        onClick={wizAddGroup}
                        className="bg-youth text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Thêm bảng
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* List of selected teams */}
                      <div className="border p-4 rounded-lg bg-gray-50">
                        <h4 className="font-semibold text-gray-700 mb-2">Đội chưa chia bảng</h4>
                        <div className="space-y-2">
                          {wizSelectedTeams.map(tId => {
                            const teamObj = teams.find(t => t.id === tId);
                            const inGroup = wizGroups.some(g => g.teams.includes(tId));
                            if (inGroup) return null;
                            return (
                              <div key={tId} className="bg-white p-2 rounded border flex justify-between items-center text-sm font-semibold">
                                <span>{teamObj?.name}</span>
                                <select
                                  onChange={(e) => wizAssignTeamToGroup(Number(e.target.value), tId)}
                                  className="border rounded text-xs p-1 outline-none"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Gán bảng</option>
                                  {wizGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Created groups list */}
                      <div className="space-y-4">
                        {wizGroups.map(g => (
                          <div key={g.id} className="border p-4 rounded-lg bg-white shadow-xs">
                            <div className="flex justify-between items-center font-bold text-gray-800 border-b pb-1 mb-2">
                              <span>{g.name}</span>
                              <span className="text-xs text-gray-400">{g.teams.length} đội</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {g.teams.map(tId => {
                                const teamObj = teams.find(t => t.id === tId);
                                return (
                                  <span key={tId} className="bg-blue-50 text-primary border border-blue-100 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                                    {teamObj?.name}
                                    <button
                                      onClick={() => wizAssignTeamToGroup(null, tId)}
                                      className="text-red-400 hover:text-red-600 font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={wizSubmitGroups}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Schedule Round Robin */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 5: Lên lịch thi đấu vòng bảng</h3>
                
                {wizTourFormat === 'knockout' ? (
                  <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                    Thể thức Đấu loại trực tiếp không chạy vòng bảng. Vui lòng nhấn Tiếp tục.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                      <button
                        onClick={wizGenerateGroupSchedule}
                        className="bg-youth text-white px-6 py-3 rounded-lg font-bold hover:bg-youth/90 shadow transition cursor-pointer"
                      >
                        ⚡ Lên lịch vòng bảng tự động (Berger Rotation)
                      </button>
                    </div>

                    {wizMatches.length > 0 && (
                      <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-50 border-b font-semibold">
                            <tr>
                              <th className="p-2">Vòng</th>
                              <th className="p-2">Đội nhà</th>
                              <th className="p-2">Đội khách</th>
                              <th className="p-2">Ngày</th>
                              <th className="p-2">Giờ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wizMatches.map((m, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-2 font-bold">{m.round}</td>
                                <td className="p-2">{m.team_a?.name || m.team_a_id}</td>
                                <td className="p-2">{m.team_b?.name || m.team_b_id}</td>
                                <td className="p-2">{m.match_date}</td>
                                <td className="p-2">{m.match_time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={wizSubmitSchedule}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Knockout configuration */}
            {wizardStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 6: Thiết lập nhánh đấu loại trực tiếp</h3>
                <p className="text-sm text-gray-500">Cấu hình vòng khởi đầu Knockout (ví dụ: Tứ kết, Bán kết, Chung kết) và lưu cấu hình nhánh đấu.</p>

                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Vòng đấu bắt đầu</label>
                      <select
                        value={wizKnockoutConfig.startingRound}
                        onChange={e => setWizKnockoutConfig(prev => ({ ...prev, startingRound: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                      >
                        <option value="Tứ kết">Tứ kết (8 đội)</option>
                        <option value="Bán kết">Bán kết (4 đội)</option>
                        <option value="Chung kết">Chung kết (2 đội)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Đường dẫn sơ đồ nhánh</label>
                      <div className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-500">
                        KO_ID matches auto mapped to next rounds.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-gray-500">Cấu hình trận vòng bắt đầu:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {wizKnockoutConfig.startingMatches.map((m, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded border shadow-xs space-y-1">
                          <div className="font-bold text-gray-800 border-b pb-0.5 mb-1 flex justify-between">
                            <span>Mã trận: {m.id}</span>
                            <span className="text-[10px] text-gray-400">Match #{idx+1}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="font-semibold text-gray-600">Home:</span>
                            <select
                              value={m.home.groupId}
                              onChange={(e) => {
                                const list = [...wizKnockoutConfig.startingMatches];
                                list[idx].home.groupId = e.target.value;
                                setWizKnockoutConfig(prev => ({ ...prev, startingMatches: list }));
                              }}
                              className="border rounded p-0.5 w-full bg-gray-50"
                            >
                              <option value="">Chọn bảng đấu...</option>
                              {wizGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <input
                              type="number"
                              min="1"
                              max="4"
                              placeholder="Hạng"
                              value={m.home.rank}
                              onChange={(e) => {
                                const list = [...wizKnockoutConfig.startingMatches];
                                list[idx].home.rank = Number(e.target.value);
                                setWizKnockoutConfig(prev => ({ ...prev, startingMatches: list }));
                              }}
                              className="border rounded p-0.5 w-12 text-center"
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="font-semibold text-gray-600">Away:</span>
                            <select
                              value={m.away.groupId}
                              onChange={(e) => {
                                const list = [...wizKnockoutConfig.startingMatches];
                                list[idx].away.groupId = e.target.value;
                                setWizKnockoutConfig(prev => ({ ...prev, startingMatches: list }));
                              }}
                              className="border rounded p-0.5 w-full bg-gray-50"
                            >
                              <option value="">Chọn bảng đấu...</option>
                              {wizGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <input
                              type="number"
                              min="1"
                              max="4"
                              placeholder="Hạng"
                              value={m.away.rank}
                              onChange={(e) => {
                                const list = [...wizKnockoutConfig.startingMatches];
                                list[idx].away.rank = Number(e.target.value);
                                setWizKnockoutConfig(prev => ({ ...prev, startingMatches: list }));
                              }}
                              className="border rounded p-0.5 w-12 text-center"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={wizGenerateKnockout}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 7: Bind sponsors */}
            {wizardStep === 7 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Bước 7: Tích hợp Nhà tài trợ cho giải đấu</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên nhà tài trợ mới..."
                    value={wizNewSponsorName}
                    onChange={e => setWizNewSponsorName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 bg-white"
                  />
                  <button
                    onClick={wizCreateNewSponsor}
                    className="bg-youth text-white px-4 py-2 rounded-lg font-semibold hover:bg-youth/90 cursor-pointer"
                  >
                    + Tạo & Gán
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Các nhà tài trợ liên kết với giải này:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-4 rounded-lg">
                    {sponsors.map(s => {
                      const isChecked = wizSelectedSponsors.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 border rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setWizSelectedSponsors(prev => prev.filter(id => id !== s.id));
                              } else {
                                setWizSelectedSponsors(prev => [...prev, s.id]);
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={wizSubmitSponsors}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark cursor-pointer transition"
                  >
                    Tiếp tục →
                  </button>
                </div>
              </div>
            )}

            {/* Step 8: Confirm and Publish */}
            {wizardStep === 8 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-800">Hoàn tất thiết lập & Công bố Giải đấu</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Giải đấu "{wizTourName}" đã sẵn sàng. Sau khi kích hoạt, giải đấu sẽ được hiển thị công khai trên giao diện trang chủ, bảng xếp hạng và lịch thi đấu.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border max-w-sm mx-auto text-left text-xs font-semibold text-gray-600 space-y-2">
                  <div>• Mùa giải: {seasons.find(s => s.id === wizSeasonId)?.name}</div>
                  <div>• Giải đấu: {wizTourName}</div>
                  <div>• Thể thức: {wizTourFormat === 'group_knockout' ? 'Chia bảng + Vòng loại' : wizTourFormat === 'knockout' ? 'Loại trực tiếp' : 'Đá vòng tròn'}</div>
                  <div>• Đội tuyển tham dự: {wizSelectedTeams.length} đội</div>
                  <div>• Nhà tài trợ đồng hành: {wizSelectedSponsors.length} nhà tài trợ</div>
                </div>

                <div className="pt-6 border-t flex justify-center gap-4">
                  <button
                    onClick={() => setWizardStep(7)}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={wizPublishTournament}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition shadow cursor-pointer animate-pulse"
                  >
                    🚀 Kích hoạt giải đấu
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
