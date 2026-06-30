import { useEffect, useState } from 'react';
import api from '../../api/client';

/**
 * Admin interface for managing the tournament schedule.
 * Allows creation of knockout‑stage matches by selecting the winners
 * of specific groups (e.g., "Winner of Group A" vs "Winner of Group C").
 * Uses the .form-label and .input-field utility classes for a consistent look.
 */
export default function AdminSchedule() {
  const [groups, setGroups] = useState([]);
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const rounds = ['Quarter‑final', 'Semi‑final', 'Final'];

  // Load groups and existing schedule on mount
  useEffect(() => {
    api.get('/groups').then(setGroups);
    // Expect the backend to expose GET /schedule returning { knockoutMatches: [] }
    api.get('/schedule').then((data) => {
      setKnockoutMatches(data?.knockoutMatches || []);
    }).catch(() => {
      // If endpoint does not exist yet, start with an empty list
      setKnockoutMatches([]);
    });
  }, []);

  const addMatch = () => {
    setKnockoutMatches((prev) => [
      ...prev,
      { round: '', home: '', away: '' },
    ]);
  };

  const updateMatch = (index, field, value) => {
    setKnockoutMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeMatch = (index) => {
    setKnockoutMatches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await api.post('/schedule', { knockoutMatches });
      alert('Lưu lịch trình thành công');
    } catch (err) {
      alert(err.message || 'Có lỗi khi lưu lịch trình');
    }
  };

  const formatGroupOption = (group) => `Winner of ${group.name}`;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý lịch thi đấu</h1>
        <button onClick={addMatch} className="btn-primary text-sm">
          + Thêm vòng knockout
        </button>
      </div>

      {/* Knockout configuration table */}
      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th>Vòng</th>
              <th>Nhà (đội thắng nhóm)</th>
              <th>Khách (đội thắng nhóm)</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {knockoutMatches.map((match, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    className="input-field"
                    value={match.round}
                    onChange={(e) => updateMatch(idx, 'round', e.target.value)}
                    required
                  >
                    <option value="">Chọn vòng</option>
                    {rounds.map((r) => (
                      <option key={r} value={r}> {r} </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="input-field"
                    value={match.home}
                    onChange={(e) => updateMatch(idx, 'home', e.target.value)}
                    required
                  >
                    <option value="">Chọn đội thắng nhóm</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {formatGroupOption(g)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="input-field"
                    value={match.away}
                    onChange={(e) => updateMatch(idx, 'away', e.target.value)}
                    required
                  >
                    <option value="">Chọn đội thắng nhóm</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {formatGroupOption(g)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="space-x-2">
                  <button
                    onClick={() => removeMatch(idx)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save button */}
      <div className="mt-4">
        <button onClick={handleSave} className="btn-primary text-sm">
          Lưu lịch trình
        </button>
      </div>
    </div>
  );
}
