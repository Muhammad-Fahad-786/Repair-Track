// ─────────────────────────────────────────────────────────────
// RepairTrack — Public Layout
// Layout shell for public-facing views (Navbar, Outlet, Footer)
// ─────────────────────────────────────────────────────────────

import { Outlet } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
