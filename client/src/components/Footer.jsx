import { Link } from 'react-router-dom';

export default function Footer() {
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
      </div>
    </footer>
  );
}
