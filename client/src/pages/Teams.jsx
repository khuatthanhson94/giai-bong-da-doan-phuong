import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getFullUrl } from '../utils/url';
import { useSettings } from '../context/SettingsContext';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/teams${params}`).then(setTeams);
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Đội bóng</h1>
      <input
        type="search"
        placeholder="Tìm kiếm đội bóng..."
        className="input-field max-w-md mb-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((t) => {
          const logo = t.logo || settings?.logo_url;
          return (
            <Link key={t.id} to={`/doi-bong/${t.id}`} className="card group hover:scale-[1.02] transition-transform">
              <div
                className="h-32 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${t.jersey_color}22, ${t.jersey_color}44)` }}
              >
                  {logo ? (
                    <img src={getFullUrl(logo)} alt="" className="team-logo" />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                      style={{ backgroundColor: t.jersey_color }}
                    >
                      {t.name.charAt(0)}
                    </div>
                  )}
              </div>
            <div className="p-5">
              <h3 className="font-bold text-lg group-hover:text-primary transition">{t.name}</h3>
              {t.coach && <p className="text-xs text-gray-400 mt-1">📋 HLV: {t.coach}</p>}
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>{t.played || 0} trận</span>
                <span className="font-semibold text-primary">{t.points || 0} điểm</span>
              </div>
            </div>
          </Link>
        )})}
      </div>
    </div>
  );
}
