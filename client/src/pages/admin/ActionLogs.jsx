import { useEffect, useState } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';

const ACTION_MAP = {
  // Auth & Account
  'CHANGE_PASSWORD': { label: 'Đổi mật khẩu cá nhân', color: 'bg-blue-100 text-blue-800' },
  'CREATE_USER': { label: 'Tạo tài khoản', color: 'bg-green-100 text-green-800' },
  'UPDATE_USER': { label: 'Cập nhật tài khoản', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_USER': { label: 'Xóa tài khoản', color: 'bg-red-100 text-red-800' },
  'RESET_PASSWORD': { label: 'Reset mật khẩu', color: 'bg-indigo-100 text-indigo-800' },
  // Teams
  'GENERATE_TEAM_ACCOUNTS': { label: 'Tạo TK đội bóng', color: 'bg-purple-100 text-purple-800' },
  'IMPORT_TEAMS': { label: 'Nhập Excel đội bóng', color: 'bg-teal-100 text-teal-800' },
  'CREATE_TEAM': { label: 'Tạo đội bóng', color: 'bg-green-100 text-green-800' },
  'UPDATE_TEAM': { label: 'Cập nhật đội bóng', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_ALL_TEAMS': { label: 'Xóa toàn bộ đội bóng', color: 'bg-red-200 text-red-900 font-semibold' },
  'DELETE_TEAM': { label: 'Xóa đội bóng', color: 'bg-red-100 text-red-800' },
  // Players
  'CREATE_PLAYER': { label: 'Thêm cầu thủ', color: 'bg-green-100 text-green-800' },
  'UPDATE_PLAYER': { label: 'Cập nhật cầu thủ', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_PLAYER': { label: 'Xóa cầu thủ', color: 'bg-red-100 text-red-800' },
  'IMPORT_PLAYERS': { label: 'Nhập Excel cầu thủ', color: 'bg-teal-100 text-teal-800' },
  // Matches
  'GENERATE_GROUP_SCHEDULE': { label: 'Tạo lịch vòng bảng', color: 'bg-blue-100 text-blue-800' },
  'GENERATE_KNOCKOUT_SCHEDULE': { label: 'Tạo lịch Knockout', color: 'bg-indigo-100 text-indigo-800' },
  'CREATE_MATCH': { label: 'Tạo trận đấu', color: 'bg-green-100 text-green-800' },
  'UPDATE_MATCH': { label: 'Cập nhật trận đấu', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_MATCH': { label: 'Xóa trận đấu', color: 'bg-red-100 text-red-800' },
  'UPDATE_MATCH_RESULT': { label: 'Nhập kết quả trận đấu', color: 'bg-purple-100 text-purple-800' },
  'PUBLISH_MATCH_RESULT': { label: 'Công bố kết quả', color: 'bg-green-100 text-green-800' },
  // Settings
  'UPDATE_SETTINGS': { label: 'Cập nhật cài đặt', color: 'bg-pink-100 text-pink-800' },
  // Sponsors
  'CREATE_SPONSOR': { label: 'Thêm nhà tài trợ', color: 'bg-green-100 text-green-800' },
  'UPDATE_SPONSOR': { label: 'Cập nhật nhà tài trợ', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_SPONSOR': { label: 'Xóa nhà tài trợ', color: 'bg-red-100 text-red-800' },
  // Groups
  'CREATE_GROUP': { label: 'Tạo bảng đấu', color: 'bg-green-100 text-green-800' },
  'UPDATE_GROUP': { label: 'Cập nhật bảng đấu', color: 'bg-yellow-100 text-yellow-800' },
  'DELETE_GROUP': { label: 'Xóa bảng đấu', color: 'bg-red-100 text-red-800' },
  'ASSIGN_TEAMS_TO_GROUP': { label: 'Xếp đội vào bảng', color: 'bg-blue-100 text-blue-800' },
  'REMOVE_TEAM_FROM_GROUP': { label: 'Xóa đội khỏi bảng', color: 'bg-red-100 text-red-800' },
  'AUTO_GENERATE_GROUPS': { label: 'Tự động chia bảng', color: 'bg-indigo-100 text-indigo-800' },
};

export default function ActionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get('/auth/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesUser = log.username.toLowerCase().includes(searchUser.toLowerCase());
    const matchesAction = selectedAction ? log.action === selectedAction : true;
    return matchesUser && matchesAction;
  });

  const exportExcel = () => {
    const headers = ['Mã log', 'Tài khoản thực hiện', 'Hành động', 'Chi tiết hoạt động', 'Thời gian'];
    const rows = filteredLogs.map((log) => {
      const actionName = ACTION_MAP[log.action]?.label || log.action;
      const formattedTime = new Date(log.created_at).toLocaleString('vi-VN');
      return [log.id, log.username, actionName, log.details || '-', formattedTime];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhật ký hoạt động');
    XLSX.writeFile(wb, 'nhat_ky_hoat_dong.xlsx');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary">Nhật ký hoạt động hệ thống</h1>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="btn-secondary text-sm py-2 px-3">
            🔄 Làm mới
          </button>
          <button onClick={exportExcel} className="btn-outline text-sm flex items-center gap-1 py-2 px-3">
            📥 Xuất Excel
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card p-4 mb-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tìm kiếm tài khoản</label>
          <input
            className="input-field"
            placeholder="Nhập tên tài khoản..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lọc theo hành động</label>
          <select
            className="input-field"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="">Tất cả hành động</option>
            {Object.keys(ACTION_MAP).map((act) => (
              <option key={act} value={act}>
                {ACTION_MAP[act].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Đang tải dữ liệu nhật ký...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Không tìm thấy ghi chép nhật ký phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tài khoản</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Chi tiết hoạt động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const actInfo = ACTION_MAP[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-800' };
                  const formattedTime = new Date(log.created_at).toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {formattedTime}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-800">{log.username}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${actInfo.color}`}>
                          {actInfo.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700 font-medium">
                        {log.details || '-'}
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
  );
}
