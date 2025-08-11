
import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { MONTH_NAMES } from './constants.js';
import { auth, db } from './firebase.js';

// --- UTILS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

// --- ICONS ---
const PlusIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement('path', { fillRule: "evenodd", d: "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z", clipRule: "evenodd" }));
const TrashIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement('path', { fillRule: "evenodd", d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z", clipRule: "evenodd" }));
const PencilIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement('path', { d: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" }), React.createElement('path', { fillRule: "evenodd", d: "M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z", clipRule: "evenodd" }));
const ChartBarIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement('path', { d: "M3 13h2v7H3v-7zm4 5h2v2H7v-2zm4-10h2v12h-2V8zm4 5h2v7h-2v-7zm4-3h2v10h-2V10z" }));
const CalendarIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement('path', { d: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" }));
const CogIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement('path', { d: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" }));
const LightBulbIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement('path', { d: "M10 2a6 6 0 00-6 6c0 3.31 1.67 6.22 4.2 7.72.32.18.5.52.5.88v1.4h2.6v-1.4c0-.36.18-.7.5-.88C14.33 14.22 16 11.31 16 8a6 6 0 00-6-6zm1.75 13h-3.5a.75.75 0 010-1.5h3.5a.75.75 0 010 1.5z" }));

// --- CONTEXTS ---
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signup = (email, password) => auth.createUserWithEmailAndPassword(email, password);
    const login = (email, password) => auth.signInWithEmailAndPassword(email, password);
    const logout = () => auth.signOut();

    const value = { currentUser, loading, signup, login, logout };

    return React.createElement(AuthContext.Provider, { value }, !loading && children);
};

const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [allBudgets, setAllBudgets] = useState({});
    const [allTransactions, setAllTransactions] = useState([]);
    const [allActualBalances, setAllActualBalances] = useState({});
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    const userRef = useMemo(() => currentUser ? db.collection('users').doc(currentUser.uid) : null, [currentUser]);

    useEffect(() => {
        if (!userRef) {
            setSettings(null);
            setAllBudgets({});
            setAllTransactions([]);
            setAllActualBalances({});
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribeSettings = userRef.onSnapshot(doc => {
            setSettings(doc.exists ? doc.data().settings : null);
            setLoading(false);
        });

        const unsubscribeBudgets = userRef.collection('budgets').onSnapshot(snapshot => {
            const budgetsData = {};
            snapshot.forEach(doc => {
                budgetsData[doc.id] = doc.data();
            });
            setAllBudgets(budgetsData);
        });

        const unsubscribeTransactions = userRef.collection('transactions').orderBy('date', 'desc').onSnapshot(snapshot => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTransactions(transactionsData);
        });
        
        const unsubscribeActualBalances = userRef.collection('actualBalances').onSnapshot(snapshot => {
            const balancesData = {};
            snapshot.forEach(doc => {
                 balancesData[doc.id] = doc.data().balances;
            });
            setAllActualBalances(balancesData);
        });


        return () => {
            unsubscribeSettings();
            unsubscribeBudgets();
            unsubscribeTransactions();
            unsubscribeActualBalances();
        };
    }, [userRef]);

    const saveSettings = useCallback(async (newSettings) => {
        if (!userRef) return Promise.reject("User not authenticated");
        await userRef.set({ settings: newSettings }, { merge: true });
    }, [userRef]);

    const saveAnnualSetup = useCallback(async (year, budgetData, balancesData) => {
        if (!userRef) return Promise.reject("User not authenticated");
        const budgetRef = userRef.collection('budgets').doc(String(year));
        const actualBalanceRef = userRef.collection('actualBalances').doc(String(year));
        await budgetRef.set(budgetData);
        await actualBalanceRef.set({ balances: balancesData });
    }, [userRef]);

    const addTransaction = useCallback(async (transaction) => {
        if (!userRef) return Promise.reject("User not authenticated");
        await userRef.collection('transactions').add(transaction);
    }, [userRef]);

    const updateTransaction = useCallback(async (transactionId, updatedTx) => {
        if (!userRef) return Promise.reject("User not authenticated");
        await userRef.collection('transactions').doc(transactionId).update(updatedTx);
    }, [userRef]);

    const deleteTransaction = useCallback(async (transactionId) => {
        if (!userRef) return Promise.reject("User not authenticated");
        await userRef.collection('transactions').doc(transactionId).delete();
    }, [userRef]);

    const updateActualBalance = useCallback(async (year, month, balance) => {
        if (!userRef) return Promise.reject("User not authenticated");
        const newBalances = [...(allActualBalances[year] || Array(12).fill(null))];
        newBalances[month] = balance;
        await userRef.collection('actualBalances').doc(String(year)).set({ balances: newBalances });
    }, [userRef, allActualBalances]);

    const value = {
        settings,
        allBudgets,
        allTransactions,
        allActualBalances,
        loading,
        saveSettings,
        saveAnnualSetup,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateActualBalance,
    };

    return React.createElement(AppContext.Provider, { value }, children);
};

const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  React.createElement('div', { className: `bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 ${className}` }, children)
);

const Button = ({ onClick, children, type = 'button', className = '', disabled = false }) => (
  React.createElement('button', {
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: `flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`
  },
    children
  )
);

const Input = ({ label, type, value, onChange, className = '', required = false, step, min, placeholder }) => (
  React.createElement('div', { className: `w-full ${className}` },
    React.createElement('label', { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, label),
    React.createElement('input', {
      type: type,
      value: value,
      onChange: onChange,
      required: required,
      step: step,
      min: min,
      placeholder: placeholder,
      className: "w-full px-3 py-2 text-gray-900 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
    })
  )
);

const Select = ({label, value, onChange, children, className, required}) => (
    React.createElement('div', { className: `w-full ${className}`},
        React.createElement('label', { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, label),
        React.createElement('select', { value: value, onChange: onChange, required: required, className: "w-full px-3 py-2 text-gray-900 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" },
            children
        )
    )
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center", 'aria-modal': "true", role: "dialog", onClick: onClose },
            React.createElement('div', { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto", onClick: e => e.stopPropagation() },
                React.createElement('div', { className: "flex justify-between items-center mb-4" },
                    React.createElement('h2', { className: "text-xl font-bold" }, title),
                    React.createElement('button', { onClick: onClose, className: "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none" }, '×')
                ),
                children
            )
        )
    );
};

// --- LAYOUT COMPONENTS ---
const Header = () => {
    const { settings } = useAppContext();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
            alert("ログアウトに失敗しました。");
        }
    };

    const navLinkClasses = "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors";
    const mobileNavLinkClasses = "block text-base";
    const activeLinkClasses = "bg-blue-600 text-white";
    const inactiveLinkClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
    const disabledLinkClasses = "text-gray-400 dark:text-gray-500 cursor-not-allowed";

    const NavLinks = ({ isMobile = false }) => (
        React.createElement(React.Fragment, null,
            React.createElement(NavLink, { to: "/monthly", className: ({isActive}) => `${isMobile ? mobileNavLinkClasses : ''} ${navLinkClasses} ${!settings ? disabledLinkClasses : (isActive ? activeLinkClasses : inactiveLinkClasses)}`, onClick: () => setIsMobileMenuOpen(false) },
                React.createElement(CalendarIcon), "月次記録"
            ),
            React.createElement(NavLink, { to: "/summary", className: ({isActive}) => `${isMobile ? mobileNavLinkClasses : ''} ${navLinkClasses} ${!settings ? disabledLinkClasses : (isActive ? activeLinkClasses : inactiveLinkClasses)}`, onClick: () => setIsMobileMenuOpen(false) },
                React.createElement(ChartBarIcon), "年間集計"
            ),
            React.createElement(NavLink, { to: "/setup", className: ({isActive}) => `${isMobile ? mobileNavLinkClasses : ''} ${navLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`, onClick: () => setIsMobileMenuOpen(false) },
                React.createElement(CogIcon), "各種設定"
            )
        )
    );

    return (
        React.createElement('header', { className: "bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40" },
            React.createElement('nav', { className: "container mx-auto px-4 sm:px-6 lg:px-8" },
                React.createElement('div', { className: "flex items-center justify-between h-16" },
                    React.createElement('div', { className: "flex-shrink-0" },
                        React.createElement(NavLink, { to: "/", className: "text-2xl font-bold text-blue-600 dark:text-blue-400" }, "AI家計簿")
                    ),
                    React.createElement('div', { className: "hidden md:flex items-baseline space-x-4" },
                         React.createElement(NavLinks),
                         currentUser && React.createElement('div', { className: "flex items-center gap-4" },
                             React.createElement('span', { className: "text-sm text-gray-500" }, currentUser.email),
                             React.createElement('button', { onClick: handleLogout, className: "px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700" }, "ログアウト")
                         )
                    ),
                    React.createElement('div', { className: "md:hidden flex items-center" },
                        React.createElement('button', { onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), className: "inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white", 'aria-controls': "mobile-menu", 'aria-expanded': isMobileMenuOpen },
                            React.createElement('span', { className: "sr-only" }, "Open main menu"),
                            isMobileMenuOpen ? (
                                React.createElement('svg', { className: "block h-6 w-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", 'aria-hidden': "true" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" }))
                            ) : (
                                React.createElement('svg', { className: "block h-6 w-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", 'aria-hidden': "true" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M4 6h16M4 12h16M4 18h16" }))
                            )
                        )
                    )
                )
            ),
            React.createElement('div', { className: `${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`, id: "mobile-menu" },
                React.createElement('div', { className: "px-2 pt-2 pb-3 space-y-1 sm:px-3" },
                    React.createElement(NavLinks, { isMobile: true }),
                     currentUser && React.createElement('div', { className: "border-t border-gray-700 pt-4 pb-3" },
                        React.createElement('div', { className: "flex items-center px-5" },
                            React.createElement('div', { className: "text-base font-medium leading-none text-white" }, currentUser.email)
                        ),
                        React.createElement('div', { className: "mt-3 px-2 space-y-1" },
                            React.createElement('button', { onClick: handleLogout, className: "block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700" }, "ログアウト")
                        )
                    )
                )
            )
        )
    );
};

const PageWrapper = ({ children, title }) => (
    React.createElement('main', { className: "container mx-auto px-4 sm:px-6 lg:px-8 py-8" },
        React.createElement('h2', { className: "text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200" }, title),
        React.createElement('div', { className: "animate-fade-in-up" },
          children
        )
    )
);

// --- SCREENS ---

const AuthForm = ({ isLogin = false }) => {
    const { signup, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
            navigate('/');
        } catch (err) {
            let message = "エラーが発生しました。";
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                message = "メールアドレスまたはパスワードが間違っています。";
            } else if (err.code === 'auth/email-already-in-use') {
                message = "このメールアドレスは既に使用されています。";
            } else if (err.code === 'auth/weak-password') {
                message = "パスワードは6文字以上で入力してください。";
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const title = isLogin ? "ログイン" : "新規登録";
    const buttonText = isLogin ? "ログイン" : "登録";
    const linkText = isLogin ? "アカウントをお持ちでないですか？ 新規登録" : "既にアカウントをお持ちですか？ ログイン";
    const linkTo = isLogin ? "/signup" : "/login";

    return React.createElement('div', { className: "min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4" },
        React.createElement(Card, { className: "w-full max-w-md" },
            React.createElement('h2', { className: "text-2xl font-bold text-center mb-6" }, title),
            React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
                React.createElement(Input, { label: "メールアドレス", type: "email", value: email, onChange: e => setEmail(e.target.value), required: true, placeholder: "email@example.com" }),
                React.createElement(Input, { label: "パスワード", type: "password", value: password, onChange: e => setPassword(e.target.value), required: true, placeholder: "6文字以上" }),
                error && React.createElement('p', { className: "text-red-500 text-sm text-center" }, error),
                React.createElement(Button, { type: "submit", className: "w-full", disabled: loading }, loading ? "処理中..." : buttonText),
                React.createElement('div', { className: "text-center mt-4" },
                    React.createElement(Link, { to: linkTo, className: "text-sm text-blue-600 hover:underline dark:text-blue-400" }, linkText)
                )
            )
        )
    );
};

const LoginScreen = () => React.createElement(AuthForm, { isLogin: true });
const SignupScreen = () => React.createElement(AuthForm, {});

const InitialSetupScreen = ({ onComplete }) => {
    const { settings, saveSettings } = useAppContext();
    const [monthlyIncome, setMonthlyIncome] = useState(settings?.monthlyIncome || 300000);
    const [initialBalance, setInitialBalance] = useState(settings?.initialBalance || 1000000);
    const [categories, setCategories] = useState(settings?.expenseCategories || [{id: 'c1', name: '食費'}, {id: 'c2', name: '住居費'}]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [summerBonus, setSummerBonus] = useState(settings?.summerBonus || 0);
    const [winterBonus, setWinterBonus] = useState(settings?.winterBonus || 0);
    const [summerBonusMonth, setSummerBonusMonth] = useState(settings?.summerBonusMonth || 7);
    const [winterBonusMonth, setWinterBonusMonth] = useState(settings?.winterBonusMonth || 12);

    const addCategory = () => {
        if (newCategoryName.trim() !== '') {
            setCategories([...categories, { id: `c${Date.now()}`, name: newCategoryName.trim() }]);
            setNewCategoryName('');
        }
    };
    
    const removeCategory = (id) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveSettings({ 
                monthlyIncome, 
                initialBalance, 
                expenseCategories: categories,
                summerBonus,
                winterBonus,
                summerBonusMonth,
                winterBonusMonth,
            });
            alert('設定を保存しました。');
            onComplete();
        } catch(error) {
            console.error("Failed to save settings:", error);
            alert("設定の保存に失敗しました。");
        }
    };

    return (
        React.createElement(Card, null,
            React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
                React.createElement(Input, { label: "月収", type: "number", value: monthlyIncome, onChange: e => setMonthlyIncome(parseFloat(e.target.value) || 0), required: true }),
                React.createElement(Input, { label: "初期残高", type: "number", value: initialBalance, onChange: e => setInitialBalance(parseFloat(e.target.value) || 0), required: true }),
                
                React.createElement('div', null,
                    React.createElement('h3', { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2" }, "支出カテゴリ"),
                    React.createElement('div', { className: "space-y-2" },
                        categories.map(cat => (
                            React.createElement('div', { key: cat.id, className: "flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded" },
                                React.createElement('span', { className: "flex-grow" }, cat.name),
                                React.createElement('button', { type: "button", onClick: () => removeCategory(cat.id), className: "text-red-500 hover:text-red-700" },
                                    React.createElement(TrashIcon)
                                )
                            )
                        ))
                    ),
                    React.createElement('div', { className: "flex gap-2 mt-2" },
                        React.createElement(Input, { label: "新しいカテゴリ名", type: "text", value: newCategoryName, onChange: e => setNewCategoryName(e.target.value), placeholder: "例: 通信費" }),
                        React.createElement(Button, { onClick: addCategory, className: "mt-auto h-[42px]" }, React.createElement(PlusIcon))
                    )
                ),

                React.createElement('div', null,
                    React.createElement('h3', { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2" }, "賞与設定"),
                    React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
                        React.createElement('div', { className: "space-y-2" },
                            React.createElement(Input, { label: "夏季賞与額", type: "number", value: summerBonus, onChange: e => setSummerBonus(parseFloat(e.target.value) || 0), required: true }),
                            React.createElement(Select, { label: "支給月", value: summerBonusMonth, onChange: e => setSummerBonusMonth(Number(e.target.value)) },
                                MONTH_NAMES.map((name, index) => React.createElement('option', { key: index + 1, value: index + 1 }, name))
                            )
                        ),
                        React.createElement('div', { className: "space-y-2" },
                            React.createElement(Input, { label: "冬季賞与額", type: "number", value: winterBonus, onChange: e => setWinterBonus(parseFloat(e.target.value) || 0), required: true }),
                             React.createElement(Select, { label: "支給月", value: winterBonusMonth, onChange: e => setWinterBonusMonth(Number(e.target.value)) },
                                MONTH_NAMES.map((name, index) => React.createElement('option', { key: index + 1, value: index + 1 }, name))
                            )
                        )
                    )
                ),
                
                React.createElement(Button, { type: "submit", className: "w-full" }, "設定を保存")
            )
        )
    );
};

const AnnualSetupScreen = () => {
    const { settings, allBudgets, saveAnnualSetup } = useAppContext();
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const [currentData, setCurrentData] = useState(null);
    const [activeTab, setActiveTab] = useState('normal');

    useEffect(() => {
        if (settings) {
            const budgetData = allBudgets[year];
            if (budgetData) {
                setCurrentData(budgetData);
            } else {
                const createInitialBudget = () => settings.expenseCategories.reduce((acc, cat) => ({...acc, [cat.id]: 0}), {});
                const prevYearBudget = allBudgets[year - 1];
                const startingBalance = prevYearBudget?.plannedBalance?.[11] ?? settings.initialBalance;
                
                setCurrentData({
                    startingBalance,
                    normalMonthBudget: createInitialBudget(),
                    bonusMonthBudget: createInitialBudget(),
                    plannedBalance: Array(12).fill(startingBalance)
                });
            }
        }
    }, [year, allBudgets, settings]);
    
    const handleBudgetChange = (type, categoryId, value) => {
        if (!currentData) return;
        const budgetKey = type === 'normal' ? 'normalMonthBudget' : 'bonusMonthBudget';
        setCurrentData({
            ...currentData,
            [budgetKey]: {
                ...currentData[budgetKey],
                [categoryId]: parseFloat(value) || 0,
            }
        });
    };

    const handlePlannedBalanceChange = (monthIndex, value) => {
        if (!currentData) return;
        const newPlannedBalance = [...currentData.plannedBalance];
        newPlannedBalance[monthIndex] = parseFloat(value) || 0;
        setCurrentData({ ...currentData, plannedBalance: newPlannedBalance });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentData) {
            try {
                await saveAnnualSetup(year, currentData, Array(12).fill(null));
                alert(`${year}年の設定を保存しました。`);
                navigate('/monthly');
            } catch (error) {
                console.error("Failed to save annual settings:", error);
                alert("年間設定の保存に失敗しました。");
            }
        }
    };

    if (!settings) {
        return React.createElement(Card, null, React.createElement('p', null, "最初に初期設定を完了してください。"));
    }
    if (!currentData) {
        return React.createElement(Card, null, React.createElement('p', null, "データをロード中..."));
    }
    
    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        React.createElement('form', { onSubmit: handleSubmit },
            React.createElement(Card, { className: "mb-6" },
                React.createElement('div', { className: "flex flex-col sm:flex-row gap-4 items-center" },
                    React.createElement(Select, { label: "対象年", value: year, onChange: e => setYear(Number(e.target.value)), className: "w-full sm:w-48" },
                        years.map(y => React.createElement('option', { key: y, value: y }, `${y}年`))
                    ),
                    React.createElement(Input, { label: "年初残高", type: "number", value: currentData.startingBalance, onChange: e => setCurrentData({...currentData, startingBalance: parseFloat(e.target.value) || 0}), className: "w-full sm:w-auto" })
                )
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement('h3', { className: "text-xl font-bold mb-4" }, "月次予算設定"),
                React.createElement('div', { className: "border-b border-gray-200 dark:border-gray-700 mb-4" },
                    React.createElement('nav', { className: "-mb-px flex space-x-8", 'aria-label': "Tabs" },
                        React.createElement('button', { type: "button", onClick: () => setActiveTab('normal'), className: `${activeTab === 'normal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm` }, "通常月"),
                        React.createElement('button', { type: "button", onClick: () => setActiveTab('bonus'), className: `${activeTab === 'bonus' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm` }, "ボーナス月")
                    )
                ),
                React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
                    settings.expenseCategories.map(cat => (
                        React.createElement(Input, {
                            key: cat.id,
                            label: cat.name,
                            type: "number",
                            value: currentData[activeTab === 'normal' ? 'normalMonthBudget' : 'bonusMonthBudget'][cat.id] || 0,
                            onChange: e => handleBudgetChange(activeTab, cat.id, e.target.value)
                        })
                    ))
                )
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement('h3', { className: "text-xl font-bold mb-4" }, "年間残高計画"),
                React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" },
                    MONTH_NAMES.map((name, index) => (
                        React.createElement(Input, {
                            key: index,
                            label: `${name}末`,
                            type: "number",
                            value: currentData.plannedBalance[index] || 0,
                            onChange: e => handlePlannedBalanceChange(index, e.target.value)
                        })
                    ))
                )
            ),

            React.createElement(Button, { type: "submit", className: "w-full" }, "年間設定を保存")
        )
    );
};

const SetupScreen = () => {
    return (
        React.createElement(PageWrapper, { title: "各種設定" },
            React.createElement('div', { className: "space-y-8" },
                React.createElement('div', null,
                    React.createElement('h3', { className: "text-2xl font-semibold mb-4 border-b pb-2" }, "初期設定"),
                    React.createElement(InitialSetupScreen, { onComplete: () => {} })
                ),
                React.createElement('div', null,
                    React.createElement('h3', { className: "text-2xl font-semibold mb-4 border-b pb-2" }, "年初設定"),
                    React.createElement(AnnualSetupScreen)
                )
            )
        )
    );
};

const ProtectedRoute = ({ children }) => {
    const { settings, allBudgets } = useAppContext();
    const location = useLocation();

    const hasBudgetData = allBudgets && Object.keys(allBudgets).length > 0;
    const isFullySetup = !!settings && hasBudgetData;

    if (!isFullySetup) {
        return React.createElement(Navigate, { to: "/setup", state: { from: location }, replace: true });
    }

    return children;
};

const AiAdvisor = ({ year, month, transactions, budget, settings }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [advice, setAdvice] = useState('');

    const generatePrompt = () => {
        const expensesByCategory = transactions
            .filter(tx => tx.type === 'expense' && tx.categoryId)
            .reduce((acc, tx) => {
                acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
                return acc;
            }, {});

        const totalBudget = budget ? Object.values(budget).reduce((a, b) => a + b, 0) : 0;
        const totalExpense = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

        let prompt = `あなたは経験豊富なファイナンシャルプランナーです。以下の家計データに基づき、ユーザーが実行可能で具体的な節約アドバイスを3つ、日本語で提案してください。フレンドリーな口調で、なぜその提案が有効なのか理由も添えてください。\n\n`;
        prompt += `# 家計データ (${year}年${month + 1}月)\n\n`;
        prompt += `## 支出サマリー\n`;
        prompt += `- 予算合計: ${formatCurrency(totalBudget)}\n`;
        prompt += `- 支出合計: ${formatCurrency(totalExpense)}\n`;
        prompt += `- 差額: ${formatCurrency(totalBudget - totalExpense)}\n\n`;
        prompt += `## カテゴリ別支出 (実績 / 予算)\n`;
        settings.expenseCategories.forEach(cat => {
            const expense = expensesByCategory[cat.id] || 0;
            const catBudget = budget?.[cat.id] || 0;
            prompt += `- ${cat.name}: ${formatCurrency(expense)} / ${formatCurrency(catBudget)}\n`;
        });

        prompt += `\n# アドバイス\n`;
        return prompt;
    };

    const handleGenerateAdvice = async () => {
        if (!process.env.API_KEY) {
            alert("APIキーが設定されていません。");
            return;
        }
        setIsModalOpen(true);
        setIsLoading(true);
        setAdvice('');

        const prompt = generatePrompt();
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    temperature: 0.7,
                    topP: 0.9,
                }
            });
            setAdvice(response.text);
        } catch (error) {
            console.error("AI advice generation failed:", error);
            setAdvice("申し訳ありません、アドバイスの生成中にエラーが発生しました。しばらくしてから再度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };
    
    const formattedAdvice = useMemo(() => {
        if (!advice) return null;
        return advice.split('\n').map((line, index) => {
            if (line.startsWith('* ') || line.startsWith('- ')) {
                return React.createElement('li', { key: index, className: 'ml-4' }, line.substring(2));
            }
            if(line.trim().length === 0){
                return React.createElement('br', { key: index });
            }
            return React.createElement('p', { key: index, className: 'mb-2' }, line);
        });
    }, [advice]);

    return React.createElement(React.Fragment, null,
        React.createElement(Button, { onClick: handleGenerateAdvice, className: "bg-purple-600 hover:bg-purple-700", disabled: isLoading },
            React.createElement(LightBulbIcon), "AI節約アドバイス"
        ),
        React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), title: "AI節約アドバイス" },
            isLoading ? (
                React.createElement('div', { className: "flex flex-col items-center justify-center p-8" },
                    React.createElement('div', { className: "animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" }),
                    React.createElement('p', { className: "mt-4 text-lg" }, "アドバイスを生成中...")
                )
            ) : (
                React.createElement('div', { className: "text-gray-700 dark:text-gray-300" }, formattedAdvice)
            )
        )
    );
};

const MonthlyTrackerScreen = () => {
    const { settings, allBudgets, allTransactions, addTransaction, updateTransaction, deleteTransaction } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    
    const initialTxState = useMemo(() => ({
        type: 'expense',
        amount: 0,
        description: '',
        categoryId: settings?.expenseCategories[0]?.id || '',
        date: new Date().toISOString().split('T')[0]
    }), [settings]);
    
    const [newTx, setNewTx] = useState(initialTxState);
    const [incomeSource, setIncomeSource] = useState('salary');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const budgetData = allBudgets[year];

    const isBonusMonth = settings && (month + 1 === settings.summerBonusMonth || month + 1 === settings.winterBonusMonth);
    const budget = budgetData?.[isBonusMonth ? 'bonusMonthBudget' : 'normalMonthBudget'];
    const totalBudget = budget ? Object.values(budget).reduce((sum, val) => sum + val, 0) : 0;
    
    const monthlyTransactions = useMemo(() => {
        const startOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
        const endOfMonth = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
        return allTransactions.filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth);
    }, [allTransactions, year, month]);
    
    const expensesByCategory = useMemo(() => 
        monthlyTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((acc, tx) => {
                if (tx.categoryId) {
                    acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
                }
                return acc;
            }, {}),
    [monthlyTransactions]);
    
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const remainingBudget = totalBudget - totalExpenses;
    
    const handleOpenAddModal = () => {
        setEditingTx(null);
        setNewTx(initialTxState);
        setIncomeSource('salary');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (tx) => {
        setEditingTx(tx);
        setNewTx({
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            categoryId: tx.categoryId || '',
            date: tx.date.split('T')[0]
        });

        if (tx.type === 'income') {
            if (tx.description === '給与') {
                setIncomeSource('salary');
            } else if (tx.description === '賞与') {
                setIncomeSource('bonus');
            } else {
                setIncomeSource('other');
            }
        }
        setIsModalOpen(true);
    };
    
    const handleDeleteTransaction = async (transactionId) => {
        if (window.confirm('この取引を削除しますか？')) {
            try {
                await deleteTransaction(transactionId);
            } catch (error) {
                console.error("Failed to delete transaction:", error);
                alert("取引の削除に失敗しました。");
            }
        }
    };
    
    const handleSaveTransaction = async () => {
        const amount = Number(newTx.amount) || 0;
        if (amount <= 0 || (newTx.type === 'expense' && !newTx.categoryId)) {
            alert('有効な金額とカテゴリを入力してください。');
            return;
        }

        let description = newTx.description;
        if (newTx.type === 'income') {
             if (incomeSource === 'salary') description = '給与';
             else if (incomeSource === 'bonus') description = '賞与';
        }

        const transactionData = { ...newTx, amount, description };
        
        try {
            if (editingTx) {
                const { id, ...txToUpdate } = transactionData;
                await updateTransaction(editingTx.id, txToUpdate);
            } else {
                await addTransaction(transactionData);
            }
            setIsModalOpen(false);
        } catch(error) {
            console.error("Failed to save transaction:", error);
            alert("取引の保存に失敗しました。");
        }
    };

    if (!settings || !budgetData) {
        return (
            React.createElement(PageWrapper, { title: "月次記録" },
                React.createElement(Card, null, 
                    React.createElement('p', null, "データを表示するには、まず初期設定と年初設定を完了してください。 ", 
                        React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面へ")
                    )
                )
            )
        );
    }
    
    return (
        React.createElement(PageWrapper, { title: "月次記録" },
            React.createElement('div', { className: "flex flex-wrap justify-between items-center mb-6 gap-4" },
                React.createElement('div', { className: "flex gap-2 items-center" },
                    React.createElement(Button, { onClick: () => setCurrentDate(new Date(year, month - 1)) }, "< 前月"),
                    React.createElement('h3', { className: "text-2xl font-bold p-2" }, `${year}年 ${MONTH_NAMES[month]}`),
                    React.createElement(Button, { onClick: () => setCurrentDate(new Date(year, month + 1)) }, "次月 >")
                ),
                React.createElement('div', { className: "flex gap-2" },
                    React.createElement(AiAdvisor, { year, month, transactions: monthlyTransactions, budget, settings }),
                    React.createElement(Button, { onClick: handleOpenAddModal }, React.createElement(PlusIcon), "収支を追加")
                )
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement('h3', { className: "text-lg font-medium text-gray-500 dark:text-gray-400" }, "今月の残予算 ", isBonusMonth && React.createElement('span', { className: "text-xs text-yellow-500" }, "(ボーナス月)")),
                React.createElement('p', { className: `text-5xl font-bold ${remainingBudget >= 0 ? 'text-blue-500' : 'text-red-500'}` }, formatCurrency(remainingBudget)),
                React.createElement('div', { className: "mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" },
                    settings.expenseCategories.map(cat => {
                        const categoryBudget = budget?.[cat.id] || 0;
                        const categoryExpenses = expensesByCategory[cat.id] || 0;
                        const remainingCategoryBudget = categoryBudget - categoryExpenses;
                        const remainingColor = remainingCategoryBudget >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
                        return (
                            React.createElement('div', { key: cat.id, className: "p-3 bg-gray-50 dark:bg-gray-700 rounded-lg" },
                                React.createElement('p', { className: "text-sm text-gray-600 dark:text-gray-300" }, cat.name),
                                React.createElement('p', { className: `text-lg font-semibold ${remainingColor}` }, formatCurrency(remainingCategoryBudget)),
                                React.createElement('p', { className: "text-xs text-gray-500" }, `予算: ${formatCurrency(categoryBudget)}`)
                            )
                        );
                    })
                )
            ),

            React.createElement(Card, null,
                React.createElement('h3', { className: "text-xl font-bold mb-4" }, "今月の収支一覧"),
                React.createElement('div', { className: "space-y-3 max-h-96 overflow-y-auto" },
                    monthlyTransactions.length > 0 ? (
                        monthlyTransactions.map(tx => (
                            React.createElement('div', { key: tx.id, className: "flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700" },
                                React.createElement('div', null,
                                    React.createElement('p', { className: "font-semibold" }, tx.description || (tx.type === 'income' ? '収入' : settings.expenseCategories.find(c => c.id === tx.categoryId)?.name)),
                                    React.createElement('p', { className: "text-sm text-gray-500" }, tx.date)
                                ),
                                React.createElement('div', { className: "flex items-center gap-4" },
                                    React.createElement('p', { className: `font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}` },
                                        `${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}`
                                    ),
                                    React.createElement('div', { className: "flex gap-2" },
                                        React.createElement('button', { onClick: () => handleOpenEditModal(tx), className: "text-gray-500 hover:text-blue-500 p-1 rounded-full transition-colors" }, React.createElement(PencilIcon)),
                                        React.createElement('button', { onClick: () => handleDeleteTransaction(tx.id), className: "text-gray-500 hover:text-red-500 p-1 rounded-full transition-colors" }, React.createElement(TrashIcon))
                                    )
                                )
                            )
                        ))
                    ) : (
                        React.createElement('p', { className: "text-center text-gray-500 py-4" }, "今月の取引はまだありません。")
                    )
                )
            ),

            React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), title: editingTx ? '収支を編集' : '収支を追加' },
                React.createElement('div', { className: "space-y-4" },
                    React.createElement(Select, { label: "種類", value: newTx.type, onChange: e => setNewTx({...newTx, type: e.target.value}) },
                        React.createElement('option', { value: "expense" }, "支出"),
                        React.createElement('option', { value: "income" }, "収入")
                    ),
                    
                    newTx.type === 'income' && (
                        React.createElement(Select, { label: "収入源", value: incomeSource, onChange: e => setIncomeSource(e.target.value) },
                            React.createElement('option', { value: "salary" }, "給与"),
                            React.createElement('option', { value: "bonus" }, "賞与"),
                            React.createElement('option', { value: "other" }, "その他")
                        )
                    ),

                    React.createElement(Input, { label: "日付", type: "date", value: newTx.date, onChange: e => setNewTx({...newTx, date: e.target.value}) }),
                    React.createElement(Input, { label: "金額", type: "number", min: "0", value: newTx.amount, onChange: e => setNewTx({...newTx, amount: parseFloat(e.target.value) || 0}), required: true }),
                    
                    newTx.type === 'expense' ? (
                        React.createElement(Select, { label: "カテゴリ", value: newTx.categoryId, onChange: e => setNewTx({...newTx, categoryId: e.target.value}), required: true },
                            React.createElement('option', { value: "" }, "カテゴリを選択..."),
                            settings.expenseCategories.map(cat => (
                                React.createElement('option', { key: cat.id, value: cat.id }, cat.name)
                            ))
                        )
                    ) : null,

                    (newTx.type === 'expense' || (newTx.type === 'income' && incomeSource === 'other')) && (
                        React.createElement(Input, { label: "説明", type: "text", value: newTx.description, onChange: e => setNewTx({...newTx, description: e.target.value}), placeholder: newTx.type === 'income' ? '収入の詳細' : '支出の詳細' })
                    ),

                    React.createElement('div', { className: "flex justify-end gap-2 pt-4" },
                        React.createElement(Button, { onClick: () => setIsModalOpen(false), className: "bg-gray-500 hover:bg-gray-600" }, "キャンセル"),
                        React.createElement(Button, { onClick: handleSaveTransaction }, editingTx ? '更新' : '追加')
                    )
                )
            )
        )
    );
};

const AnnualSummaryScreen = () => {
    const { settings, allBudgets, allTransactions, allActualBalances, updateActualBalance } = useAppContext();
    const [year, setYear] = useState(new Date().getFullYear());
    
    const availableYears = Object.keys(allBudgets).map(Number).sort((a,b) => b-a);
    const budgetData = allBudgets[year];
    const actualBalances = allActualBalances[year] || Array(12).fill(null);

    useEffect(() => {
        if (!budgetData && availableYears.length > 0) {
            setYear(availableYears[0]);
        }
    }, [year, budgetData, availableYears]);

    const summaryData = useMemo(() => {
        if (!settings || !budgetData) return [];

        let runningBalance = budgetData.startingBalance;

        return MONTH_NAMES.map((monthName, i) => {
            const startOfMonth = new Date(Date.UTC(year, i, 1)).toISOString().split('T')[0];
            const endOfMonth = new Date(Date.UTC(year, i + 1, 0)).toISOString().split('T')[0];
            const monthlyTransactions = allTransactions.filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth);
            
            const income = monthlyTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
            const expense = monthlyTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            
            runningBalance += income - expense;

            return {
                name: monthName,
                monthIndex: i,
                income,
                expense,
                calculatedBalance: runningBalance,
                actualBalance: actualBalances[i],
                plannedBalance: budgetData.plannedBalance[i]
            };
        });

    }, [settings, budgetData, allTransactions, actualBalances, year]);


    const handleActualBalanceChange = (monthIndex, value) => {
        const balance = value === '' ? null : parseFloat(value);
        if (value !== '' && isNaN(balance)) {
             return;
        }
        updateActualBalance(year, monthIndex, balance).catch(error => {
            console.error("Failed to update actual balance:", error);
            alert("実績残高の更新に失敗しました。");
        });
    };

    if (!settings || availableYears.length === 0) {
        return (
            React.createElement(PageWrapper, { title: "年間集計" },
                React.createElement(Card, null, React.createElement('p', null, "データを表示するには、まず初期設定と年初設定を完了してください。 ", React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面へ")))
            )
        );
    }
     if (!budgetData) {
        return (
            React.createElement(PageWrapper, { title: "年間集計" },
                 React.createElement(Select, { label: "対象年", value: year, onChange: e => setYear(Number(e.target.value)), className: "w-48 mb-4" },
                    availableYears.map(y => React.createElement('option', { key: y, value: y }, `${y}年`))
                ),
                React.createElement(Card, null, React.createElement('p', null, `${year}年のデータがありません。 `, React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面"), "で追加してください。"))
            )
        );
    }

    return (
        React.createElement(PageWrapper, { title: "年間集計" },
             React.createElement(Card, { className: "mb-6" },
                React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement(Select, { label: "対象年", value: year, onChange: e => setYear(Number(e.target.value)), className: "w-48" },
                        availableYears.map(y => React.createElement('option', { key: y, value: y }, `${y}年`))
                    )
                )
            ),

            React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
                React.createElement(Card, null,
                    React.createElement('h3', { className: "text-xl font-bold mb-4" }, "月次収支グラフ"),
                    React.createElement(ResponsiveContainer, { width: "100%", height: 300 },
                        React.createElement(BarChart, { data: summaryData },
                            React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                            React.createElement(XAxis, { dataKey: "name" }),
                            React.createElement(YAxis, { tickFormatter: (val) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(val) }),
                            React.createElement(Tooltip, { formatter: (value) => formatCurrency(value) }),
                            React.createElement(Legend),
                            React.createElement(Bar, { dataKey: "income", fill: "#3b82f6", name: "収入" }),
                            React.createElement(Bar, { dataKey: "expense", fill: "#ef4444", name: "支出" })
                        )
                    )
                ),

                React.createElement(Card, null,
                    React.createElement('h3', { className: "text-xl font-bold mb-4" }, "残高推移グラフ"),
                    React.createElement(ResponsiveContainer, { width: "100%", height: 300 },
                        React.createElement(LineChart, { data: summaryData },
                            React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                            React.createElement(XAxis, { dataKey: "name" }),
                            React.createElement(YAxis, { tickFormatter: (val) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(val) }),
                            React.createElement(Tooltip, { formatter: (value) => formatCurrency(value) }),
                            React.createElement(Legend),
                            React.createElement(Line, { type: "monotone", dataKey: "plannedBalance", stroke: "#a0aec0", name: "計画残高", strokeDasharray: "5 5", dot: false }),
                            React.createElement(Line, { type: "monotone", dataKey: "calculatedBalance", stroke: "#4a90e2", name: "計算残高" }),
                            React.createElement(Line, { type: "monotone", dataKey: "actualBalance", stroke: "#50e3c2", name: "実績残高", connectNulls: true })
                        )
                    )
                )
            ),
            
            React.createElement(Card, { className: "mt-6" },
                React.createElement('h3', { className: "text-xl font-bold mb-4" }, "年間収支詳細"),
                 React.createElement('div', { className: "overflow-x-auto" },
                    React.createElement('table', { className: "w-full text-left whitespace-nowrap" },
                        React.createElement('thead', null,
                            React.createElement('tr', { className: "bg-gray-50 dark:bg-gray-700 text-sm" },
                                React.createElement('th', { className: "p-3 font-semibold" }, "月"),
                                React.createElement('th', { className: "p-3 font-semibold" }, "収入"),
                                React.createElement('th', { className: "p-3 font-semibold" }, "支出"),
                                React.createElement('th', { className: "p-3 font-semibold" }, "計算残高"),
                                React.createElement('th', { className: "p-3 font-semibold" }, "実績残高"),
                                React.createElement('th', { className: "p-3 font-semibold" }, "計画残高")
                            )
                        ),
                        React.createElement('tbody', null,
                            summaryData.map((d) => (
                                React.createElement('tr', { key: d.monthIndex, className: "border-b dark:border-gray-700" },
                                    React.createElement('td', { className: "p-3 font-medium" }, d.name),
                                    React.createElement('td', { className: "p-3 text-green-600" }, formatCurrency(d.income)),
                                    React.createElement('td', { className: "p-3 text-red-600" }, formatCurrency(d.expense)),
                                    React.createElement('td', { className: "p-3" }, formatCurrency(d.calculatedBalance)),
                                    React.createElement('td', { className: "p-3 w-40" },
                                         React.createElement(Input, {
                                            label: "",
                                            type: "number",
                                            value: d.actualBalance ?? '',
                                            onChange: e => handleActualBalanceChange(d.monthIndex, e.target.value),
                                            className: "w-full",
                                            placeholder: "実績残高..."
                                        })
                                    ),
                                    React.createElement('td', { className: "p-3 text-gray-500" }, formatCurrency(d.plannedBalance))
                                )
                            ))
                        )
                    )
                )
            )
        )
    );
};

const AppShell = () => {
    const { settings, allBudgets, loading } = useAppContext();
    const hasBudgetData = allBudgets && Object.keys(allBudgets).length > 0;
    const isFullySetup = !!settings && hasBudgetData;

    if (loading) {
        return React.createElement('div', {className: "flex justify-center items-center h-screen"}, React.createElement('p', null, "データを読み込み中..."));
    }

    return (
        React.createElement('div', { className: "min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100" },
            React.createElement(Header),
            React.createElement(Routes, null,
                React.createElement(Route, { path: "/setup", element: React.createElement(SetupScreen) }),
                React.createElement(Route, { path: "/monthly", element: React.createElement(ProtectedRoute, null, React.createElement(MonthlyTrackerScreen)) }),
                React.createElement(Route, { path: "/summary", element: React.createElement(ProtectedRoute, null, React.createElement(AnnualSummaryScreen)) }),
                React.createElement(Route, { path: "/", element: React.createElement(Navigate, { to: isFullySetup ? "/monthly" : "/setup", replace: true }) }),
                React.createElement(Route, { path: "*", element: React.createElement(PageWrapper, { title: "ページが見つかりません" }, React.createElement(Card, null, React.createElement('p', null, "お探しのページは見つかりませんでした。"))) })
            )
        )
    );
};

const RequireAuth = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return React.createElement('div', {className: "flex justify-center items-center h-screen"}, React.createElement('p', null, "認証情報を確認中..."));
    }

    if (!currentUser) {
        return React.createElement(Navigate, { to: "/login", state: { from: location }, replace: true });
    }

    return children;
};

const App = () => {
  return (
    React.createElement(HashRouter, null,
        React.createElement(AuthProvider, null,
            React.createElement(Routes, null,
                React.createElement(Route, { path: "/login", element: React.createElement(LoginScreen) }),
                React.createElement(Route, { path: "/signup", element: React.createElement(SignupScreen) }),
                React.createElement(Route, { path: "/*", element:
                    React.createElement(RequireAuth, null, 
                        React.createElement(AppContextProvider, null,
                            React.createElement(AppShell)
                        )
                    )
                })
            )
        )
    )
  );
};

export default App;
