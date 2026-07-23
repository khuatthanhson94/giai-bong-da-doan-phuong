import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import api from './api/client';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Home page kept static for immediate first paint
import Home from './pages/Home';

// Lazy load remaining public pages
const About = lazy(() => import('./pages/About'));
const Schedule = lazy(() => import('./pages/Schedule'));
const PublicResults = lazy(() => import('./pages/Results'));
const Standings = lazy(() => import('./pages/Standings'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetail = lazy(() => import('./pages/TeamDetail'));
const Players = lazy(() => import('./pages/Players'));
const Statistics = lazy(() => import('./pages/Statistics'));
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Contact = lazy(() => import('./pages/Contact'));

// Lazy load admin pages
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminGroups = lazy(() => import('./pages/admin/Groups'));
const AdminTeams = lazy(() => import('./pages/admin/Teams'));
const AdminPlayers = lazy(() => import('./pages/admin/Players'));
const AdminMatches = lazy(() => import('./pages/admin/Matches'));
const AdminResults = lazy(() => import('./pages/admin/Results'));
const AdminSchedule = lazy(() => import('./pages/admin/AdminSchedule'));
const AdminNews = lazy(() => import('./pages/admin/News'));
const AdminGallery = lazy(() => import('./pages/admin/GalleryAdmin'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminSponsors = lazy(() => import('./pages/admin/Sponsors'));
const AdminActionLogs = lazy(() => import('./pages/admin/ActionLogs'));
const AdminSeasons = lazy(() => import('./pages/admin/Seasons'));
const AdminTournaments = lazy(() => import('./pages/admin/Tournaments'));
const AdminRecycleBin = lazy(() => import('./pages/admin/RecycleBin'));
const AdminBackup = lazy(() => import('./pages/admin/Backup'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

export default function App() {
  useEffect(() => {
    // 1. Track visit session
    if (!sessionStorage.getItem('session_tracked')) {
      api.post('/track-visit').then(() => {
        sessionStorage.setItem('session_tracked', 'true');
      }).catch((err) => {
        console.error('Failed to track visit:', err);
      });
    }

    // 2. Speculative Idle Prefetching: Pre-load public JS chunks & API data when browser is idle
    const prefetchPublicRoutes = () => {
      // Prefetch JS modules
      import('./pages/Schedule');
      import('./pages/Results');
      import('./pages/Standings');
      import('./pages/Teams');
      import('./pages/News');

      // Pre-warm client API cache in background
      api.get('/standings').catch(() => {});
      api.get('/teams').catch(() => {});
      api.get('/sponsors').catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prefetchPublicRoutes, { timeout: 2000 });
    } else {
      setTimeout(prefetchPublicRoutes, 1500);
    }
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public site */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="gioi-thieu" element={<About />} />
          <Route path="lich-thi-dau" element={<Schedule />} />
          <Route path="ket-qua" element={<PublicResults />} />
          <Route path="bang-xep-hang" element={<Standings />} />
          <Route path="doi-bong" element={<Teams />} />
          <Route path="doi-bong/:id" element={<TeamDetail />} />
          <Route path="cau-thu" element={<Players />} />
          <Route path="thong-ke" element={<Statistics />} />
          <Route path="tin-tuc" element={<News />} />
          <Route path="tin-tuc/:id" element={<NewsDetail />} />
          <Route path="thu-vien-anh" element={<Gallery />} />
          <Route path="lien-he" element={<Contact />} />
        </Route>

        {/* Admin area */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="groups" element={<AdminGroups />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="seasons" element={<AdminSeasons />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="recyclebin" element={<AdminRecycleBin />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="sponsors" element={<AdminSponsors />} />
          <Route path="action-logs" element={<AdminActionLogs />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
