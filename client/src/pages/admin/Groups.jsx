import { useEffect, useState } from 'react';
import { groupsApi } from '../../api/groups';
import { api } from '../../api/client';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'settings'
  const [groupCount, setGroupCount] = useState(2);
  const [newGroupName, setNewGroupName] = useState('');

  // Load groups and all teams
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [gData, tData] = await Promise.all([
        groupsApi.fetchGroups(),
        api.get('/teams'), // generic endpoint for all teams
      ]);
      setGroups(gData);
      setTeams(tData);
      // compute unassigned teams
      const assignedIds = new Set();
      gData.forEach(g => g.teams?.forEach(t => assignedIds.add(t.id)));
      setUnassigned(tData.filter(t => !assignedIds.has(t.id)));
    } catch (e) {
      console.error(e);
    }
  }

  // Assign selected team(s) to a group
  async function assignTeam(groupId, teamId) {
    try {
      await groupsApi.assignTeams(groupId, [teamId]);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  // Remove team from group
  async function removeTeam(groupId, teamId) {
    try {
      await api.delete(`/groups/${groupId}/teams/${teamId}`);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  // Generate groups automatically
  async function generateGroups() {
    try {
      await groupsApi.generateGroups({ count: Number(groupCount) });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  // Create a new group manually
  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await groupsApi.createGroup(newGroupName.trim());
      setNewGroupName('');
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  // Delete a group manually
  async function handleDeleteGroup(groupId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bảng đấu này? Tất cả các đội thuộc bảng này sẽ trở lại trạng thái chưa phân bảng.')) return;
    try {
      await groupsApi.deleteGroup(groupId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-primary">Quản lý Bảng đấu (Groups)</h2>
      
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded font-medium text-sm transition ${activeTab === 'manage' ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setActiveTab('manage')}
        >
          Quản lý đội & Bảng đấu
        </button>
        <button
          className={`px-4 py-2 rounded font-medium text-sm transition ${activeTab === 'settings' ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setActiveTab('settings')}
        >
          Cấu hình tự động
        </button>
      </div>

      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Add Group Form */}
          <form onSubmit={handleCreateGroup} className="card p-4 flex flex-wrap gap-3 items-center bg-gray-50 border border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Tạo bảng thủ công:</span>
            <input
              type="text"
              placeholder="Tên bảng mới (ví dụ: Bảng C)"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="input-field max-w-xs py-1.5 px-3 text-sm"
              required
            />
            <button type="submit" className="btn-primary text-xs py-2 px-4">
              + Thêm bảng đấu
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Unassigned teams */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="font-bold mb-3 text-gray-800 border-b pb-2 flex justify-between items-center">
                <span>Đội chưa phân bảng</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{unassigned.length} đội</span>
              </h3>
              <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {unassigned.map(team => (
                  <li key={team.id} className="flex justify-between items-center p-2.5 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition">
                    <span className="font-medium text-sm text-gray-700">{team.name}</span>
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          assignTeam(Number(e.target.value), team.id);
                          e.target.value = "";
                        }
                      }}
                      className="border rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Gán vào bảng...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </li>
                ))}
                {unassigned.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Tất cả các đội đã được phân vào bảng đấu.</p>
                )}
              </ul>
            </div>

            {/* Right: Groups and assignments */}
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {groups.map(group => (
                <div key={group.id} className="border rounded-lg p-4 bg-white shadow-sm border-gray-200">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <span>{group.name}</span>
                      <span className="bg-blue-50 text-primary text-xs px-2 py-0.5 rounded-full">{(group.teams || []).length} đội</span>
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Xóa bảng
                    </button>
                  </div>
                  
                  <ul className="space-y-2">
                    {(group.teams || []).map(team => (
                      <li key={team.id} className="flex justify-between items-center p-2.5 border rounded-lg hover:bg-gray-50 transition">
                        <span className="font-medium text-sm text-gray-700">{team.name}</span>
                        <div className="flex items-center gap-3">
                          {/* Transfer group dropdown */}
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                assignTeam(Number(e.target.value), team.id);
                              }
                            }}
                            value={group.id}
                            className="border rounded px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          
                          {/* Remove button */}
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                            onClick={() => removeTeam(group.id, team.id)}
                          >
                            Loại bỏ
                          </button>
                        </div>
                      </li>
                    ))}
                    {(group.teams || []).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4 italic">Chưa có đội nào trong bảng đấu này.</p>
                    )}
                  </ul>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Chưa có bảng đấu nào được tạo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-md card p-6 bg-white shadow-sm border border-gray-100 mt-2">
          <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Sinh tự động danh sách bảng</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            * Lưu ý: Thao tác này sẽ xóa toàn bộ danh sách bảng đấu hiện tại và các liên kết đội bóng để tạo lại số lượng bảng tương ứng, tự động phân ngẫu nhiên các đội hiện có vào các bảng đấu.
          </p>
          <div className="flex items-center space-x-3 mb-6">
            <label className="block text-sm font-semibold text-gray-700">Số lượng bảng đấu:</label>
            <input
              type="number"
              min="1"
              max="26"
              value={groupCount}
              onChange={e => setGroupCount(e.target.value)}
              className="border rounded px-3 py-1.5 w-20 text-center text-sm font-semibold"
            />
          </div>
          <button
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition shadow-sm"
            onClick={generateGroups}
          >
            Tự động chia bảng ngẫu nhiên
          </button>
        </div>
      )}
    </div>
  );
}
