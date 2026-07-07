import { useEffect, useState } from 'react';
import api from '../api/client';

import { getFullUrl } from '../utils/url';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [album, setAlbum] = useState('');

  useEffect(() => {
    api.get('/gallery/albums').then(setAlbums);
  }, []);

  useEffect(() => {
    const params = album ? `?album=${encodeURIComponent(album)}` : '';
    api.get(`/gallery${params}`).then(setItems);
  }, [album]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Thư viện ảnh</h1>
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setAlbum('')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${!album ? 'bg-primary text-white' : 'bg-gray-100'}`}
        >
          Tất cả
        </button>
        {albums.map((a) => (
          <button
            key={a}
            onClick={() => setAlbum(a)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${album === a ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden group">
            {item.type === 'video' ? (
              <div className="aspect-square bg-gray-900 flex items-center justify-center">
                <span className="text-white text-4xl">▶</span>
              </div>
            ) : item.image_url ? (
              <img src={getFullUrl(item.image_url)} alt={item.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-youth/20 flex items-center justify-center text-4xl">📷</div>
            )}
            <div className="p-3">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-gray-400">{item.album}</p>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="text-center text-gray-500 py-12">Chưa có ảnh/video</p>}
    </div>
  );
}
