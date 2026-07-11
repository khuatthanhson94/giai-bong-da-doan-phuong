import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';

import { getFullUrl } from '../utils/url';

export default function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [qr, setQr] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    api.get(`/news/${id}`).then(setItem);
    api.get(`/qrcode?url=${encodeURIComponent(window.location.href)}`)
      .then(res => setQr(res.qr))
      .catch(console.error);
  }, [id]);

  if (!item) return <div className="text-center py-20">Đang tải...</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <Link to="/tin-tuc" className="text-primary text-sm hover:underline mb-4 inline-block">← Quay lại tin tức</Link>
      <span className="text-xs text-youth font-medium uppercase">{item.category}</span>
      <h1 className="text-3xl font-bold text-primary mt-2 mb-4">{item.title}</h1>
      <p className="text-sm text-gray-400 mb-8">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
      {(item.image || settings?.logo_url) && (
        <img src={getFullUrl(item.image || settings.logo_url)} alt="" className="w-full rounded-xl mb-8 object-contain max-h-[500px] bg-gray-50/50" />
      )}
      <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />
      {item.video_url && (
        <div className="mt-8">
          <iframe src={item.video_url} className="w-full aspect-video rounded-xl" allowFullScreen title="Video" />
        </div>
      )}

      {/* QR Code Sharing */}
      {qr && (
        <div className="mt-12 border-t pt-6 flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl">
          <img src={qr} alt="QR Code" className="w-24 h-24 border bg-white p-1 rounded-lg shadow-sm" />
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-gray-800 text-sm">Chia sẻ tin bài này</h4>
            <p className="text-xs text-gray-500 mt-1">Quét mã QR Code trên để mở bài viết thể thao này trực tiếp trên thiết bị di động của bạn.</p>
          </div>
        </div>
      )}
    </article>
  );
}
