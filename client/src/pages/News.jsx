import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

import { getFullUrl } from '../utils/url';

const categories = [
  { value: '', label: 'Tất cả' },
  { value: 'khai-mac', label: 'Khai mạc' },
  { value: 'vong-dau', label: 'Vòng đấu' },
  { value: 'tong-ket', label: 'Tổng kết' },
];

export default function News() {
  const [news, setNews] = useState([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = category ? `?category=${category}` : '';
    api.get(`/news${params}`).then(setNews);
  }, [category]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Tin tức</h1>
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === c.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((n) => (
          <Link key={n.id} to={`/tin-tuc/${n.id}`} className="card group">
            <div className="h-48 bg-gradient-to-br from-primary/10 to-youth/10 flex items-center justify-center">
              {n.image ? <img src={getFullUrl(n.image)} alt="" className="w-full h-full object-cover" /> : <span className="text-5xl">📰</span>}
            </div>
            <div className="p-5">
              <span className="text-xs text-youth font-medium uppercase">{n.category}</span>
              <h3 className="font-bold mt-1 group-hover:text-primary transition">{n.title}</h3>
              <p className="text-xs text-gray-400 mt-3">{new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
