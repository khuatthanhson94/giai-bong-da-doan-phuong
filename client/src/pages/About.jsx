import { useEffect, useState } from 'react';
import api from '../api/client';

export default function About() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings').then(setSettings);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">Giới thiệu</h1>
      <div className="card p-8 space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white text-3xl font-bold mb-4">
            ĐP
          </div>
          <h2 className="text-2xl font-bold text-primary">{settings.tournament_name}</h2>
          <p className="text-youth italic mt-2">"{settings.slogan}"</p>
        </div>
        <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: settings.about || '' }} />
        <div className="grid md:grid-cols-3 gap-4 pt-6 border-t">
          {[
            { icon: '🏆', title: 'Thi đấu công bằng', desc: 'Luật bóng đá 7 người chuẩn' },
            { icon: '🤝', title: 'Tinh thần đoàn kết', desc: 'Giao lưu, học hỏi lẫn nhau' },
            { icon: '💪', title: 'Rèn luyện thể chất', desc: 'Nâng cao sức khỏe thanh niên' },
          ].map((item) => (
            <div key={item.title} className="text-center p-4">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-primary">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
