import { useEffect, useState } from 'react';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

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
          {settings.logo_url ? (
            <img
              src={getFullUrl(settings.logo_url)}
              alt="Logo Giải Đấu"
              className="w-24 h-24 mx-auto object-contain rounded-full border bg-white p-1 shadow-sm mb-4"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white text-3xl font-bold mb-4">
              ĐP
            </div>
          )}
          <h2 className="text-2xl font-bold text-primary">{settings.tournament_name}</h2>
          <p className="text-youth italic mt-2">"{settings.slogan}"</p>
        </div>
        <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: settings.about || '' }} />
        <div className="grid md:grid-cols-3 gap-4 pt-6 border-t">
          {[
            {
              icon: settings.feature_1_icon || '🏆',
              title: settings.feature_1_title || 'Thi đấu công bằng',
              desc: settings.feature_1_desc || 'Luật bóng đá 7 người chuẩn'
            },
            {
              icon: settings.feature_2_icon || '🤝',
              title: settings.feature_2_title || 'Tinh thần đoàn kết',
              desc: settings.feature_2_desc || 'Giao lưu, học hỏi lẫn nhau'
            },
            {
              icon: settings.feature_3_icon || '💪',
              title: settings.feature_3_title || 'Rèn luyện thể chất',
              desc: settings.feature_3_desc || 'Nâng cao sức khỏe thanh niên'
            },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-4">
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
