import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900">TaskFlow</span>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
            <button className="sm:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {menuOpen && (
            <div className="sm:hidden pb-3 border-t border-gray-100 pt-3">
              <span className="block text-sm text-gray-600 mb-2">{user?.name}</span>
              <button onClick={logout} className="flex items-center gap-1 text-sm text-red-600">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
