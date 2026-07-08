import { useState } from 'react';
import { Navigate, Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TournamentInfo from './TournamentInfo';

const menuItems = [
  { to: '/admin', label: 'Dashboard', roles: ['super_admin', 'admin', 'editor', 'scorekeeper', 'team'] },
  { to: '/admin/teams', label: 'Đội bóng', roles: ['super_admin', 'admin', 'team'] },
  { to: '/admin/groups', label: 'Bảng (Groups)', roles: ['super_admin', 'admin'] },
  { to: '/admin/players', label: 'Cầu thủ', roles: ['super_admin', 'admin', 'team'] },
  { to: '/admin/matches', label: 'Lịch thi đấu', roles: ['super_admin', 'admin', 'scorekeeper'] },
  { to: '/admin/results', label: 'Nhập kết quả', roles: ['super_admin', 'admin', 'scorekeeper'] },
  { to: '/admin/news', label: 'Tin tức', roles: ['super_admin', 'admin', 'editor'] },
  { to: '/admin/gallery', label: 'Thư viện', roles: ['super_admin', 'admin', 'editor'] },
  { to: '/admin/users', label: 'Tài khoản', roles: ['super_admin'] },
  { to: '/admin/settings', label: 'Cài đặt', roles: ['super_admin', 'admin', 'team'] },
  { to: '/admin/schedule', label: 'Lịch thi đấu (Knockout)', roles: ['super_admin', 'admin'] },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  const visibleMenu = menuItems
    .filter((m) => m.roles.includes(user.role))
    .map((m) => {
      if (m.to === '/admin/teams' && user.role === 'team') {
        return { ...m, label: 'Đội bóng của tôi' };
      }
      return m;
    });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-primary text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-5 border-b border-white/20">
          <h2 className="font-bold text-lg">Quản trị</h2>
          <p className="text-xs text-blue-200 mt-1">{user.username} ({user.role})</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleMenu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm transition ${isActive ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/20 space-y-1">
          <Link to="/" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-lg">← Về trang chủ</Link>
          <button onClick={logout} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-lg">
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header for admin pages */}
        <header className="md:hidden bg-primary text-white p-4 flex items-center justify-between relative">
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-1.5 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <span className="font-bold">Quản trị</span>
          <button onClick={logout} className="text-sm bg-white/10 px-2 py-1 rounded">Đăng xuất</button>

          {showMobileMenu && (
            <div className="absolute top-14 left-0 right-0 bg-primary border-t border-white/10 z-50 shadow-lg p-3 space-y-1 animate-fade-in">
              {visibleMenu.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={() => setShowMobileMenu(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-lg text-sm transition ${
                      isActive ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t border-white/10 pt-2 mt-2">
                <Link to="/" onClick={() => setShowMobileMenu(false)} className="block px-4 py-2.5 text-sm hover:bg-white/10 rounded-lg">← Về trang chủ</Link>
              </div>
            </div>
          )}
        </header>
        {/* New layout: left info panel + main content */}
        <div className="flex gap-6">
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
