import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { getFullUrl } from '../utils/url';
import { useSettings } from '../context/SettingsContext';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const { settings } = useSettings();

  useEffect(() => {
    api.get(`/teams/${id}`).then(setTeam).catch(() => setTeam(null));
  }, [id]);

  if (!team) return <div className="text-center py-20 text-gray-500">Đang tải...</div>;

  const logo = team.logo || team.logo_url || settings?.logo_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <Link to="/doi-bong" className="text-primary text-sm hover:underline mb-4 inline-block">← Quay lại</Link>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${team.jersey_color}, ${team.jersey_color}aa)` }}>
          <div className="text-center text-white">
            <div className="w-[400px] h-[400px] mx-auto rounded-full overflow-hidden">
              {logo ? (
                <img src={getFullUrl(logo)} alt="Team Logo" className="team-logo" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                  {team.name.charAt(0)}
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold mt-3">{team.name}</h1>
          </div>
        </div>
        <div className="p-6 md:p-8">
          <p className="text-gray-600 mb-6">{team.description}</p>
          
          {(team.coach || team.stadium) && (
            <div className="flex flex-wrap gap-6 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              {team.coach && (
                <div>
                  <span className="text-gray-500 font-medium">📋 Huấn luyện viên trưởng:</span>{' '}
                  <span className="font-bold text-gray-800">{team.coach}</span>
                </div>
              )}
              {team.stadium && (
                <div>
                  <span className="text-gray-500 font-medium">🏟️ Sân nhà:</span>{' '}
                  <span className="font-bold text-gray-800">{team.stadium}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { l: 'Số trận', v: team.played },
              { l: 'Thắng', v: team.won },
              { l: 'Hòa', v: team.drawn },
              { l: 'Điểm', v: team.points },
            ].map(({ l, v }) => (
              <div key={l} className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{v || 0}</div>
                <div className="text-sm text-gray-500">{l}</div>
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold text-primary mb-4">Danh sách cầu thủ</h2>
          <div className="overflow-x-auto">
            <table className="table-styled">
              <thead>
                <tr><th>Ảnh</th><th>Số áo</th><th>Họ tên</th><th>Vị trí</th><th>Bàn thắng</th></tr>
              </thead>
              <tbody>
                {team.players?.map((p) => (
                  <tr key={p.id}>
                    <td className="w-12 h-12">
                      {p.photo ? (
                        <img src={getFullUrl(p.photo)} alt="Player" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-full" />
                      )}
                    </td>
                    <td className="font-bold">{p.jersey_number}</td>
                    <td>{p.name}</td>
                    <td>{p.position}</td>
                    <td className="text-primary font-semibold">{p.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
