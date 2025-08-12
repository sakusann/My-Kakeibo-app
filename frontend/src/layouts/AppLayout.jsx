import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiBarChart2, FiSettings, FiLogOut } from 'react-icons/fi';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      alert('ログアウトに失敗しました。');
    }
  };
  
  // 参照アプリのスタイルに合わせたクラス
  const linkClass = "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
  const activeClass = "bg-blue-600 text-white shadow-sm";
  const inactiveClass = "text-slate-600 hover:bg-slate-200";

  return (
    <header className="bg-white/70 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="text-2xl font-bold text-blue-600">
              家計簿アプリ
            </NavLink>
            <div className="hidden md:flex items-baseline space-x-4">
              <NavLink to="/monthly" className={({isActive}) => `${linkClass} ${isActive ? activeClass : inactiveClass}`}>
                <FiCalendar /> 月次記録
              </NavLink>
              <NavLink to="/summary" className={({isActive}) => `${linkClass} ${isActive ? activeClass : inactiveClass}`}>
                <FiBarChart2 /> 年間集計
              </NavLink>
              <NavLink to="/settings" className={({isActive}) => `${linkClass} ${isActive ? activeClass : inactiveClass}`}>
                <FiSettings /> 各種設定
              </NavLink>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{currentUser?.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition"
              title="ログアウト"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};


const AppLayout = () => {
  return (
    // 背景色はbodyで指定するため、ここでは色指定を削除
    <div className="min-h-screen">
      <Header />
      {/* PageWrapperをここに追加 */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
         <div className="animate-fade-in-up">
            <Outlet />
         </div>
      </main>
    </div>
  );
};

export default AppLayout;