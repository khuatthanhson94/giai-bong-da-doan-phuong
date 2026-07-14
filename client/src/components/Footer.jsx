import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Footer() {
  const [visits, setVisits] = useState(null);

  useEffect(() => {
    api.get('/visits-count')
      .then(setVisits)
      .catch((err) => console.error('Failed to load visit count:', err));
  }, []);
  return (
    <footer className="bg-gradient-to-r from-primary-dark to-primary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-3">Giải Bóng đá Thanh niên</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Sân chơi lành mạnh do Đoàn phường tổ chức, góp phần rèn luyện thể chất và tinh thần đoàn kết cho thanh niên.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Liên kết nhanh</h3>
            <div className="flex flex-col gap-2 text-sm text-blue-100">
              <Link to="/lich-thi-dau" className="hover:text-white transition">Lịch thi đấu</Link>
              <Link to="/ket-qua" className="hover:text-white transition">Kết quả</Link>
              <Link to="/bang-xep-hang" className="hover:text-white transition">Bảng xếp hạng</Link>
              <Link to="/admin/login" className="hover:text-white transition opacity-60">Quản trị</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Chia sẻ</h3>
            <div className="flex gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition"
              >
                Facebook
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Đã sao chép link!');
                }}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition"
              >
                Sao chép link
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm text-blue-200">
          © 2026 Đoàn phường. All rights reserved.
        </div>
        {visits && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-blue-200/80 select-none">
            <div className="flex items-center gap-1">
              <span>⚡ Đang trực tuyến: <span className="text-white font-bold">1</span></span>
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block"></div>
            <div className="flex items-center gap-1">
              <span>📅 Hôm nay: <span className="text-white font-bold">{visits.today_visits}</span> lượt ({visits.today_unique_visitors} khách)</span>
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block"></div>
            <div className="flex items-center gap-1">
              <span>📈 Tổng cộng: <span className="text-white font-bold">{visits.total_visits}</span> lượt ({visits.total_unique_visitors} khách)</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
