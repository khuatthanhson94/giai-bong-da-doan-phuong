import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import api from '../api/client';

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
  { to: '/lich-thi-dau', label: 'Lịch thi đấu' },
  { to: '/ket-qua', label: 'Kết quả' },
  { to: '/bang-xep-hang', label: 'Bảng xếp hạng' },
  { to: '/doi-bong', label: 'Đội bóng' },
  { to: '/cau-thu', label: 'Cầu thủ' },
  { to: '/thong-ke', label: 'Thống kê' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/thu-vien-anh', label: 'Thư viện ảnh' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings')
      .then(setSettings)
      .catch(err => console.error('Failed to load settings in navbar:', err));
  }, []);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const baseUrl = API_BASE || window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            {settings.union_logo ? (
              <img
                src={getFullUrl(settings.union_logo)}
                alt="Logo"
                className="w-10 h-10 rounded-full object-contain bg-white border border-gray-100 p-0.5 animate-fade-in"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-sm">
                ĐP
              </div>
            )}
            <div className="hidden sm:block">
              <div className="font-bold text-primary text-sm leading-tight">
                {settings.union_name || 'ĐOÀN PHƯỜNG'}
              </div>
              <div className="text-xs text-youth font-medium">
                {settings.tournament_name_short || 'Giải Bóng đá TN'}
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-primary'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <nav className="lg:hidden pb-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-blue-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
