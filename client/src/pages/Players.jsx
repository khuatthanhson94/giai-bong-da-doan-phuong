import { useEffect, useState } from 'react';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/players${params}`).then(setPlayers);
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Cầu thủ</h1>
      <input
        type="search"
        placeholder="Tìm kiếm cầu thủ hoặc đội..."
        className="input-field max-w-md mb-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {players.map((p) => (
          <div key={p.id} className="card p-5 text-center hover:shadow-lg transition">
            {p.photo ? (
              <img
                src={getFullUrl(p.photo)}
                alt=""
                className="w-20 h-20 mx-auto rounded-full object-cover mb-3"
              />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white text-2xl font-bold mb-3">
                {p.jersey_number}
              </div>
            )}
            <h3 className="font-bold">{p.name}</h3>
            <p className="text-sm text-youth font-medium">{p.team_name}</p>
            <p className="text-xs text-gray-500 mt-1">{p.position}</p>
            <div className="flex justify-center gap-4 mt-4 text-sm">
              <span className="text-primary font-semibold">⚽ {p.goals}</span>
              <span className="text-yellow-600">🟨 {p.yellow_cards}</span>
              <span className="text-red-600">🟥 {p.red_cards}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
