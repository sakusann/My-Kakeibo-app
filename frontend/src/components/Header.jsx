import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi';

const Header = () => {
    const { settings, theme, toggleTheme } = useAppContext();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // メニューの外側をクリックしたときに閉じる
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch {
            alert('ログアウトに失敗しました。');
        }
    };

    const navLinkClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors";
    const activeLinkClasses = "bg-blue-600 text-white";
    const inactiveLinkClasses = "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
    const disabledLinkClasses = "text-gray-400 dark:text-gray-500 cursor-not-allowed";

    const getLinkClassName = ({ isActive }) => {
        if (!hasSettings) {
            return `${navLinkClasses} ${disabledLinkClasses}`;
        }
        return `${navLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: App Title */}
                    <div className="flex-shrink-0">
                        <NavLink to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            家計簿アプリ
                        </NavLink>
                    </div>

                    {/* Right: Icons and Menu */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="テーマを切り替え"
                        >
                            {theme === 'dark' ? <FiSun /> : <FiMoon />}
                        </button>

                        {/* Hamburger Menu */}
                        <div className="relative" ref={menuRef}>
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                aria-controls="main-menu"
                                aria-expanded={isMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? <FiX className="block h-6 w-6" /> : <FiMenu className="block h-6 w-6" />}
                            </button>

                            {/* Dropdown Panel */}
                            {isMenuOpen && (
                                <div 
                                    id="main-menu"
                                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-2 z-50"
                                >
                                    <div className="px-4 py-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">ログイン中:</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{currentUser?.email}</p>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-700"/>
                                    <div className="py-2 px-2 space-y-1">
                                        <NavLink to="/monthly" className={getLinkClassName} onClick={() => setIsMenuOpen(false)} aria-disabled={!hasSettings}>
                                            <FiCalendar /> 月次記録
                                        </NavLink>
                                        <NavLink to="/summary" className={getLinkClassName} onClick={() => setIsMenuOpen(false)} aria-disabled={!hasSettings}>
                                            <FiBarChart2 /> 年間集計
                                        </NavLink>
                                        <NavLink to="/settings" className={getLinkClassName} onClick={() => setIsMenuOpen(false)}>
                                            <FiSettings /> 各種設定
                                        </NavLink>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-700"/>
                                    <div className="p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-base font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition"
                                            title="ログアウト"
                                        >
                                            <FiLogOut /> ログアウト
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;