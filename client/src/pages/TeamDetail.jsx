import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { getFullUrl } from '../utils/url';
import { useSettings } from '../context/SettingsContext';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [qr, setQr] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    api.get(`/teams/${id}`).then(setTeam).catch(() => setTeam(null));
    api.get(`/qrcode?url=${encodeURIComponent(window.location.href)}`)
      .then(res => setQr(res.qr))
      .catch(console.error);
  }, [id]);

  if (!team) return <div className="text-center py-20 text-gray-500">Đang tải...</div>;

  const logo = team.logo || team.logo_url || settings?.logo_url;

  const stats = [
    { l: 'Số trận đã đấu', v: team.played, bg: 'from-blue-50 to-indigo-100 text-indigo-700 border-indigo-100' },
    { l: 'Trận thắng', v: team.won, bg: 'from-emerald-50 to-teal-100 text-emerald-700 border-emerald-100' },
    { l: 'Trận hòa', v: team.drawn, bg: 'from-amber-50 to-orange-100 text-amber-700 border-amber-100' },
    { l: 'Tổng điểm số', v: team.points, bg: 'from-blue-50 to-blue-100 text-primary border-blue-200' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <Link to="/doi-bong" className="text-primary text-sm hover:underline mb-4 inline-block font-semibold">← Quay lại danh sách</Link>
      
      <div className="bg-white rounded-3xl shadow-xl border border-gray-150 overflow-hidden mb-8">
        {/* Banner gradient background */}
        <div className="h-32 md:h-48 relative" style={{ background: `linear-gradient(135deg, ${team.jersey_color}, ${team.jersey_color}88)` }}>
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        {/* Profile header content */}
        <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
          {/* Logo container overlapping the banner */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white shadow-xl p-3 flex items-center justify-center border-4 border-white select-none">
              {logo ? (
                <img src={getFullUrl(logo)} alt="Team Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-4xl font-bold rounded-xl text-white"
                  style={{ backgroundColor: team.jersey_color }}
                >
                  {team.name.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="text-center md:text-left flex-1 space-y-2">
              <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">{team.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 mt-2">
                {team.coach && (
                  <p className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
                    <span className="text-gray-400">📋 HLV Trưởng:</span>
                    <span className="text-gray-800">{team.coach}</span>
                  </p>
                )}
                {team.stadium && (
                  <p className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
                    <span className="text-gray-400">🏟️ Sân nhà:</span>
                    <span className="text-gray-800">{team.stadium}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Team Description / Introduction */}
          {team.description && (
            <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 md:p-6 mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giới thiệu đội bóng</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{team.description}</p>
            </div>
          )}

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ l, v, bg }) => (
              <div key={l} className={`p-4 rounded-2xl border bg-gradient-to-br ${bg} text-center shadow-sm`}>
                <div className="text-3xl font-black">{v || 0}</div>
                <div className="text-xs font-bold opacity-80 mt-1">{l}</div>
              </div>
            ))}
          </div>

          {/* Player list and QR code sharing stays inside the same card wrapper */}
          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
              🏃‍♂️ Danh sách cầu thủ
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-2 py-2 md:px-3 md:py-3 text-center font-bold w-10">STT</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-left font-bold w-12">Ảnh</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-left font-bold w-12">Số</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-left font-bold">Họ tên</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-left font-bold">Vị trí</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-right font-bold w-16">Bàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {team.players?.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-2 py-2.5 md:px-3 md:py-3 text-center font-semibold text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-2.5 md:px-3 md:py-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                          {p.photo ? (
                            <img src={getFullUrl(p.photo)} alt="Player" className="w-full h-full object-cover rounded-full shadow-sm" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-[10px] text-gray-400 font-bold">
                              {p.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 md:px-3 md:py-3 font-bold text-gray-700">{p.jersey_number}</td>
                      <td className="px-2 py-2.5 md:px-3 md:py-3 font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">{p.name}</td>
                      <td className="px-2 py-2.5 md:px-3 md:py-3 text-gray-600">{p.position}</td>
                      <td className="px-2 py-2.5 md:px-3 md:py-3 text-right text-primary font-black">{p.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Code Sharing */}
          {qr && (
            <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <img src={qr} alt="QR Code" className="w-24 h-24 border bg-white p-1 rounded-lg shadow-sm" />
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-gray-800 text-sm">Chia sẻ Đội bóng này</h4>
                <p className="text-xs text-gray-500 mt-1">Quét mã QR Code trên để xem chi tiết đội bóng và danh sách cầu thủ trực tiếp trên điện thoại di động của bạn.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
