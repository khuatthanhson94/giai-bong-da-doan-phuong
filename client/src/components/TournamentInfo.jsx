import { useEffect, useState } from 'react';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

export default function TournamentInfo() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings').then((data) => setSettings(data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      {settings.banner_url && (
        <img
          src={getFullUrl(settings.banner_url)}
          alt="Banner"
          className="w-full h-32 object-cover rounded-md"
        />
      )}
      <div className="flex items-center gap-4">
        {settings.logo_url && (
          <img
            src={getFullUrl(settings.logo_url)}
            alt="Logo"
            className="w-16 h-16 object-contain"
          />
        )}
        <div>
          <h2 className="text-lg font-bold text-primary">{settings.tournament_name || 'Giải đấu'}</h2>
          {settings.slogan && <p className="text-sm text-gray-600">{settings.slogan}</p>}
        </div>
      </div>
    </div>
  );
}
