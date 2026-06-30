import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/Login';
console.log('🚀 AdminSchedule component file loaded');
import Home from './pages/Home';
import About from './pages/About';
import Schedule from './pages/Schedule';
import PublicResults from './pages/Results';
import AdminResults from './pages/admin/Results';
import Standings from './pages/Standings';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Players from './pages/Players';
import Statistics from './pages/Statistics';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import AdminDashboard from './pages/admin/Dashboard';
import AdminGroups from './pages/admin/Groups';
import AdminTeams from './pages/admin/Teams';
import AdminPlayers from './pages/admin/Players';
import AdminMatches from './pages/admin/Matches';
import AdminSchedule from './pages/admin/AdminSchedule';

    // after existing admin routes

import AdminNews from './pages/admin/News';
import AdminGallery from './pages/admin/GalleryAdmin';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';

export default function App() {
  return (
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
        <Route path="news" element={<AdminNews />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
