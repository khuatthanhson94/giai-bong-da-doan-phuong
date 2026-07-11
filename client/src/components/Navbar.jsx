import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useTournament } from '../context/TournamentContext';

const primaryNavItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/lich-thi-dau', label: 'Lịch đấu' },
  { to: '/ket-qua', label: 'Kết quả' },
  { to: '/bang-xep-hang', label: 'BXH' },
  { to: '/doi-bong', label: 'Đội bóng' },
  { to: '/thong-ke', label: 'Thống kê' },
  { to: '/tin-tuc', label: 'Tin tức' },
];

const secondaryNavItems = [
  { to: '/cau-thu', label: 'Cầu thủ' },
  { to: '/thu-vien-anh', label: 'Thư viện ảnh' },
  { to: '/gioi-thieu', label: 'Giới thiệu giải' },
  { to: '/lien-he', label: 'Liên hệ' },
];

const mobileNavItems = [
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
  const { settings } = useSettings();
  const { seasons, tournaments, selectedSeasonId, selectedTournamentId, changeSeason, changeTournament } = useTournament();

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
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
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

          {/* Context Picker: Season & Tournament Selector */}
          <div className="flex items-center gap-1 md:gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs">
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => changeSeason(e.target.value)}
              className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer hover:text-primary transition-colors py-0.5 px-1 max-w-[90px] sm:max-w-[120px] md:max-w-none"
            >
              <option value="" disabled>-- Mùa giải --</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <select
              value={selectedTournamentId || ''}
              onChange={(e) => changeTournament(e.target.value)}
              className="bg-transparent font-semibold text-primary outline-none cursor-pointer hover:text-primary-dark transition-colors py-0.5 px-1 max-w-[100px] sm:max-w-[150px] md:max-w-none"
            >
              <option value="" disabled>-- Giải đấu --</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <nav className="flex items-center gap-1">
              {primaryNavItems.map((item) => (
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

              {/* Hover Dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-primary flex items-center gap-0.5 cursor-pointer">
                  Xem thêm <span className="text-[10px] text-gray-400">▼</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1">
                  {secondaryNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm transition-colors ${
                          isActive ? 'bg-blue-50 text-primary font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-primary'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>
            <Link
              to="/admin"
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1"
            >
              🔐 Đăng nhập
            </Link>
          </div>

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
              {mobileNavItems.map((item) => (
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
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="col-span-2 mt-2 bg-primary text-white text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"
              >
                🔐 Đăng nhập quản trị
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
