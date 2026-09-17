import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useCompany } from '../../contexts/CompanyContext';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { config: companyConfig } = useCompany();

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-2 p-3 bg-white border-b border-surface-200">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-surface-500 hover:bg-surface-100 rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img
            src="/dmaast_logo.png"
            alt="SMAP Logo"
            className="w-10 h-10"
          />
          <span className="font-semibold text-surface-900">SMAP</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${companyConfig.accent}`}
          >
            {companyConfig.fullName}
          </span>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
