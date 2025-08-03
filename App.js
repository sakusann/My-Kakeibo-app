import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MONTH_NAMES } from './constants.js';

// --- UTILS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

// --- ICONS ---
const PlusIcon = () => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement("path", { fillRule: "evenodd", d: "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z", clipRule: "evenodd" }));
const TrashIcon = () => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" }, React.createElement("path", { fillRule: "evenodd", d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z", clipRule: "evenodd" }));
const ChartBarIcon = () => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement("path", { d: "M3 13h2v7H3v-7zm4 5h2v2H7v-2zm4-10h2v12h-2V8zm4 5h2v7h-2v-7zm4-3h2v10h-2V10z" }));
const CalendarIcon = () => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement("path", { d: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" }));
const CogIcon = () => React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", viewBox: "0 0 24 24", fill: "currentColor" }, React.createElement("path", { d: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" }));

// --- CONTEXT ---
const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  const [state, setState] = useState({
    settings: null,
    annualData: {},
  });

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('financeTrackerState');
      if (savedState) {
        setState(JSON.parse(savedState));
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('financeTrackerState', JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [state]);

  const saveSettings = (settings) => {
    setState(prev => ({ ...prev, settings }));
  };

  const saveAnnualData = (year, data) => {
    setState(prev => ({
      ...prev,
      annualData: { ...prev.annualData, [year]: data },
    }));
  };

  const addTransaction = (year, transaction) => {
    setState(prev => {
      const yearData = prev.annualData[year];
      if (!yearData) return prev;
      return {
        ...prev,
        annualData: {
          ...prev.annualData,
          [year]: {
            ...yearData,
            transactions: [...yearData.transactions, transaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          },
        },
      };
    });
  };

  const updateActualBalance = (year, month, balance) => {
    setState(prev => {
      const yearData = prev.annualData[year];
      if (!yearData) return prev;
      const newActualBalances = [...yearData.actualBalances];
      newActualBalances[month] = balance;
      return {
        ...prev,
        annualData: {
          ...prev.annualData,
          [year]: {
            ...yearData,
            actualBalances: newActualBalances,
          },
        },
      };
    });
  };


  return React.createElement(AppContext.Provider, { value: { ...state, saveSettings, saveAnnualData, addTransaction, updateActualBalance } }, children);
};

const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
}

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  React.createElement("div", { className: `bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 ${className}` }, children)
);

const Button = ({ onClick, children, type = 'button', className = '', disabled = false }) => (
  React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: `flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`
  },
    children
  )
);

const Input = ({ label, type, value, onChange, className = '', required = false, step, min, placeholder }) => (
  React.createElement("div", { className: `w-full ${className}` },
    React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, label),
    React.createElement("input", {
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
    React.createElement("div", { className: `w-full ${className}` },
        React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, label),
        React.createElement("select", { value: value, onChange: onChange, required: required, className: "w-full px-3 py-2 text-gray-900 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" },
            children
        )
    )
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center", "aria-modal": "true", role: "dialog", onClick: onClose },
            React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 m-4", onClick: e => e.stopPropagation() },
                React.createElement("div", { className: "flex justify-between items-center mb-4" },
                    React.createElement("h2", { className: "text-xl font-bold" }, title),
                    React.createElement("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none" }, "×")
                ),
                children
            )
        )
    );
};


// --- LAYOUT COMPONENTS ---
const Header = () => {
    const { settings } = useAppContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        React.createElement("header", { className: "bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40" },
            React.createElement("nav", { className: "container mx-auto px-4 sm:px-6 lg:px-8" },
                React.createElement("div", { className: "flex items-center justify-between h-16" },
                    React.createElement("div", { className: "flex-shrink-0" },
                        React.createElement(NavLink, { to: "/", className: "text-2xl font-bold text-blue-600 dark:text-blue-400" }, "家計簿アプリ")
                    ),
                    React.createElement("div", { className: "hidden md:flex items-baseline space-x-4" },
                        React.createElement(NavLinks, null)
                    ),
                    React.createElement("div", { className: "md:hidden flex items-center" },
                        React.createElement("button", { onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), className: "inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white", "aria-controls": "mobile-menu", "aria-expanded": isMobileMenuOpen },
                            React.createElement("span", { className: "sr-only" }, "Open main menu"),
                            isMobileMenuOpen ? (
                                React.createElement("svg", { className: "block h-6 w-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" }))
                            ) : (
                                React.createElement("svg", { className: "block h-6 w-6", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M4 6h16M4 12h16M4 18h16" }))
                            )
                        )
                    )
                )
            ),
            React.createElement("div", { className: `${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`, id: "mobile-menu" },
                React.createElement("div", { className: "px-2 pt-2 pb-3 space-y-1 sm:px-3" },
                    React.createElement(NavLinks, { isMobile: true })
                )
            )
        )
    );
};

const PageWrapper = ({ children, title }) => (
    React.createElement("main", { className: "container mx-auto px-4 sm:px-6 lg:px-8 py-8" },
        React.createElement("h2", { className: "text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200" }, title),
        React.createElement("div", { className: "animate-fade-in-up" },
          children
        )
    )
);

// --- SCREENS ---
const InitialSetupScreen = ({ onComplete }) => {
    const { settings, saveSettings } = useAppContext();
    const [monthlyIncome, setMonthlyIncome] = useState(settings?.monthlyIncome || 300000);
    const [initialBalance, setInitialBalance] = useState(settings?.initialBalance || 1000000);
    const [categories, setCategories] = useState(settings?.expenseCategories || [{id: 'c1', name: '食費'}, {id: 'c2', name: '住居費'}]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [bonusMonths, setBonusMonths] = useState(settings?.bonusMonths || [7, 12]);

    const addCategory = () => {
        if (newCategoryName.trim() !== '') {
            setCategories([...categories, { id: `c${Date.now()}`, name: newCategoryName.trim() }]);
            setNewCategoryName('');
        }
    };
    
    const removeCategory = (id) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    const toggleBonusMonth = (month) => {
        setBonusMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month].sort((a,b)=>a-b));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveSettings({ monthlyIncome, initialBalance, expenseCategories: categories, bonusMonths });
        alert('設定を保存しました。');
        onComplete();
    };

    return (
        React.createElement(Card, null,
            React.createElement("form", { onSubmit: handleSubmit, className: "space-y-6" },
                React.createElement(Input, { label: "月収", type: "number", value: monthlyIncome, onChange: e => setMonthlyIncome(parseFloat(e.target.value) || 0), required: true }),
                React.createElement(Input, { label: "初期残高", type: "number", value: initialBalance, onChange: e => setInitialBalance(parseFloat(e.target.value) || 0), required: true }),
                
                React.createElement("div", null,
                    React.createElement("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2" }, "支出カテゴリ"),
                    React.createElement("div", { className: "space-y-2" },
                        categories.map(cat => (
                            React.createElement("div", { key: cat.id, className: "flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded" },
                                React.createElement("span", { className: "flex-grow" }, cat.name),
                                React.createElement("button", { type: "button", onClick: () => removeCategory(cat.id), className: "text-red-500 hover:text-red-700" },
                                    React.createElement(TrashIcon, null)
                                )
                            )
                        ))
                    ),
                    React.createElement("div", { className: "flex gap-2 mt-2" },
                        React.createElement(Input, { label: "新しいカテゴリ名", type: "text", value: newCategoryName, onChange: e => setNewCategoryName(e.target.value) }),
                        React.createElement(Button, { onClick: addCategory, className: "mt-auto h-[42px]" }, React.createElement(PlusIcon, null))
                    )
                ),

                React.createElement("div", null,
                    React.createElement("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2" }, "ボーナス月"),
                    React.createElement("div", { className: "grid grid-cols-4 sm:grid-cols-6 gap-2" },
                        MONTH_NAMES.map((name, index) => (
                             React.createElement("label", { key: index, className: `flex items-center justify-center p-2 border rounded-md cursor-pointer transition-colors ${bonusMonths.includes(index + 1) ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 dark:bg-gray-700 dark:border-gray-600'}`},
                                 React.createElement("input", { type: "checkbox", checked: bonusMonths.includes(index+1), onChange: () => toggleBonusMonth(index+1), className: "sr-only" }),
                                 name
                             )
                        ))
                    )
                ),
                
                React.createElement(Button, { type: "submit", className: "w-full" }, "設定を保存")
            )
        )
    );
};

const AnnualSetupScreen = () => {
    const { settings, annualData, saveAnnualData } = useAppContext();
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const [currentData, setCurrentData] = useState(null);
    const [activeTab, setActiveTab] = useState('normal');

    useEffect(() => {
        if (settings) {
            const data = annualData[year];
            if (data) {
                setCurrentData(data);
            } else {
                const createInitialBudget = () => settings.expenseCategories.reduce((acc, cat) => ({...acc, [cat.id]: 0}), {});
                const startingBalance = annualData[year-1]?.actualBalances[11] ?? settings.initialBalance;
                setCurrentData({
                    budget: {
                        year,
                        startingBalance,
                        normalMonthBudget: createInitialBudget(),
                        bonusMonthBudget: createInitialBudget(),
                        plannedBalance: Array(12).fill(startingBalance)
                    },
                    transactions: [],
                    actualBalances: Array(12).fill(null),
                });
            }
        }
    }, [year, annualData, settings]);

    const handleBudgetChange = (type, categoryId, value) => {
        if (!currentData) return;
        const budgetKey = type === 'normal' ? 'normalMonthBudget' : 'bonusMonthBudget';
        setCurrentData({
            ...currentData,
            budget: {
                ...currentData.budget,
                [budgetKey]: {
                    ...currentData.budget[budgetKey],
                    [categoryId]: parseFloat(value) || 0,
                }
            }
        });
    };

    const handlePlannedBalanceChange = (monthIndex, value) => {
        if (!currentData) return;
        const newPlannedBalance = [...currentData.budget.plannedBalance];
        newPlannedBalance[monthIndex] = parseFloat(value) || 0;
        setCurrentData({
            ...currentData,
            budget: {
                ...currentData.budget,
                plannedBalance: newPlannedBalance,
            }
        });
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentData) {
            saveAnnualData(year, currentData);
            alert(`${year}年の設定を保存しました。`);
            navigate('/monthly');
        }
    };

    if (!settings) {
        return React.createElement(Card, null, React.createElement("p", null, "最初に初期設定を完了してください。"));
    }
    if (!currentData) {
        return React.createElement(Card, null, React.createElement("p", null, "データをロード中..."));
    }
    
    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        React.createElement("form", { onSubmit: handleSubmit },
            React.createElement(Card, { className: "mb-6" },
                React.createElement("div", { className: "flex flex-col sm:flex-row gap-4 items-center" },
                    React.createElement(Select, { label: "対象年", value: year, onChange: e => setYear(Number(e.target.value)), className: "w-full sm:w-48" },
                        years.map(y => React.createElement("option", { key: y, value: y }, y, "年"))
                    ),
                    React.createElement(Input, { label: "年初残高", type: "number", value: currentData.budget.startingBalance, onChange: e => setCurrentData({...currentData, budget: {...currentData.budget, startingBalance: parseFloat(e.target.value) || 0}}), className: "w-full sm:w-auto" })
                )
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement("h3", { className: "text-xl font-bold mb-4" }, "月次予算設定"),
                React.createElement("div", { className: "border-b border-gray-200 dark:border-gray-700 mb-4" },
                    React.createElement("nav", { className: "-mb-px flex space-x-8", "aria-label": "Tabs" },
                        React.createElement("button", { type: "button", onClick: () => setActiveTab('normal'), className: `${activeTab === 'normal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm` }, "通常月"),
                        React.createElement("button", { type: "button", onClick: () => setActiveTab('bonus'), className: `${activeTab === 'bonus' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm` }, "ボーナス月")
                    )
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
                    settings.expenseCategories.map(cat => (
                        React.createElement(Input, {
                            key: cat.id,
                            label: cat.name,
                            type: "number",
                            value: currentData.budget[activeTab === 'normal' ? 'normalMonthBudget' : 'bonusMonthBudget'][cat.id] || 0,
                            onChange: e => handleBudgetChange(activeTab, cat.id, e.target.value)
                        })
                    ))
                )
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement("h3", { className: "text-xl font-bold mb-4" }, "年間残高計画"),
                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" },
                    MONTH_NAMES.map((name, index) => (
                        React.createElement(Input, { 
                            key: index,
                            label: `${name}末`,
                            type: "number",
                            value: currentData.budget.plannedBalance[index] || 0,
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
    const navigate = useNavigate();
    return (
        React.createElement(PageWrapper, { title: "各種設定" },
            React.createElement("div", { className: "space-y-8" },
                React.createElement("div", null,
                    React.createElement("h3", { className: "text-2xl font-semibold mb-4 border-b pb-2" }, "初期設定"),
                    React.createElement(InitialSetupScreen, { onComplete: () => navigate('/setup') })
                ),
                React.createElement("div", null,
                    React.createElement("h3", { className: "text-2xl font-semibold mb-4 border-b pb-2" }, "年初設定"),
                    React.createElement(AnnualSetupScreen, null)
                )
            )
        )
    );
};


const MonthlyTrackerScreen = () => {
    const { settings, annualData, addTransaction } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const initialTxState = useMemo(() => ({
        type: 'expense',
        amount: 0,
        description: '',
        categoryId: settings?.expenseCategories[0]?.id || '',
        date: new Date().toISOString().split('T')[0]
    }), [settings]);
    
    const [newTx, setNewTx] = useState(initialTxState);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11
    
    const yearData = annualData[year];

    const isBonusMonth = settings?.bonusMonths.includes(month + 1);
    const budget = yearData?.budget?.[isBonusMonth ? 'bonusMonthBudget' : 'normalMonthBudget'];
    const totalBudget = budget ? Object.values(budget).reduce((sum, val) => sum + val, 0) : 0;
    
    const monthlyTransactions = useMemo(() => 
        yearData?.transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getUTCFullYear() === year && txDate.getUTCMonth() === month;
        }) || [], 
    [yearData, year, month]);
    
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
    
    const handleOpenModal = () => {
        setNewTx(initialTxState);
        setIsModalOpen(true);
    };
    
    const handleAddTransaction = () => {
        const amount = Number(newTx.amount) || 0;
        if (amount <= 0 || (newTx.type === 'expense' && !newTx.categoryId)) {
            alert('有効な金額とカテゴリを入力してください。');
            return;
        }
        addTransaction(year, {
            ...newTx,
            id: `tx${Date.now()}`,
            amount: amount,
        });
        setIsModalOpen(false);
    };

    if (!settings || !yearData) {
        return (
            React.createElement(PageWrapper, { title: "月次記録" },
                React.createElement(Card, null, 
                    React.createElement("p", null, 
                        "データを表示するには、まず初期設定と年初設定を完了してください。 ",
                        React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面へ")
                    )
                )
            )
        );
    }
    
    return (
        React.createElement(PageWrapper, { title: "月次記録" },
            React.createElement("div", { className: "flex justify-between items-center mb-6" },
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement(Button, { onClick: () => setCurrentDate(new Date(year, month - 1)) }, "< 前月"),
                    React.createElement("h3", { className: "text-2xl font-bold p-2" }, `${year}年 ${MONTH_NAMES[month]}`),
                    React.createElement(Button, { onClick: () => setCurrentDate(new Date(year, month + 1)) }, "次月 >")
                ),
                React.createElement(Button, { onClick: handleOpenModal }, React.createElement(PlusIcon, null), "収支を追加")
            ),

            React.createElement(Card, { className: "mb-6" },
                React.createElement("h3", { className: "text-lg font-medium text-gray-500 dark:text-gray-400" }, 
                    "今月の残予算 ",
                    isBonusMonth && React.createElement("span", { className: "text-xs text-yellow-500" }, "(ボーナス月)")
                ),
                React.createElement("p", { className: `text-5xl font-bold ${remainingBudget >= 0 ? 'text-blue-500' : 'text-red-500'}` }, formatCurrency(remainingBudget)),
                React.createElement("div", { className: "mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" },
                    settings.expenseCategories.map(cat => {
                        const categoryBudget = budget?.[cat.id] || 0;
                        const categoryExpenses = expensesByCategory[cat.id] || 0;
                        const remainingCategoryBudget = categoryBudget - categoryExpenses;
                        const remainingColor = remainingCategoryBudget >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
                        return (
                            React.createElement("div", { key: cat.id, className: "p-3 bg-gray-50 dark:bg-gray-700 rounded-lg" },
                                React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-300" }, cat.name),
                                React.createElement("p", { className: `text-lg font-semibold ${remainingColor}` }, formatCurrency(remainingCategoryBudget)),
                                React.createElement("p", { className: "text-xs text-gray-500" }, "予算: ", formatCurrency(categoryBudget))
                            )
                        );
                    })
                )
            ),

            React.createElement(Card, null,
                React.createElement("h3", { className: "text-xl font-bold mb-4" }, "今月の収支一覧"),
                React.createElement("div", { className: "space-y-3 max-h-96 overflow-y-auto" },
                    monthlyTransactions.length > 0 ? (
                        monthlyTransactions.map(tx => (
                            React.createElement("div", { key: tx.id, className: "flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700" },
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-semibold" }, tx.description || (tx.type === 'income' ? '収入' : settings.expenseCategories.find(c => c.id === tx.categoryId)?.name)),
                                    React.createElement("p", { className: "text-sm text-gray-500" }, tx.date)
                                ),
                                React.createElement("p", { className: `font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}` },
                                    `${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}`
                                )
                            )
                        ))
                    ) : (
                        React.createElement("p", { className: "text-center text-gray-500 py-4" }, "今月の取引はまだありません。")
                    )
                )
            ),

            React.createElement(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), title: "収支を追加" },
                React.createElement("div", { className: "space-y-4" },
                    React.createElement(Select, { label: "種類", value: newTx.type, onChange: e => setNewTx({...newTx, type: e.target.value })},
                        React.createElement("option", { value: "expense" }, "支出"),
                        React.createElement("option", { value: "income" }, "収入")
                    ),
                    React.createElement(Input, { label: "日付", type: "date", value: newTx.date, onChange: e => setNewTx({...newTx, date: e.target.value}) }),
                    React.createElement(Input, { label: "金額", type: "number", min: "0", value: newTx.amount, onChange: e => setNewTx({...newTx, amount: parseFloat(e.target.value) || 0 }), required: true }),
                    newTx.type === 'expense' && (
                        React.createElement(Select, { label: "カテゴリ", value: newTx.categoryId, onChange: e => setNewTx({...newTx, categoryId: e.target.value }), required: true },
                            React.createElement("option", { value: "" }, "カテゴリを選択..."),
                            settings.expenseCategories.map(cat => (
                                React.createElement("option", { key: cat.id, value: cat.id }, cat.name)
                            ))
                        )
                    ),
                    React.createElement(Input, { label: "説明（任意）", type: "text", value: newTx.description, onChange: e => setNewTx({...newTx, description: e.target.value }) }),
                    React.createElement("div", { className: "flex justify-end gap-2 pt-4" },
                        React.createElement(Button, { onClick: () => setIsModalOpen(false), className: "bg-gray-500 hover:bg-gray-600" }, "キャンセル"),
                        React.createElement(Button, { onClick: handleAddTransaction }, "追加")
                    )
                )
            )
        )
    );
};

const AnnualSummaryScreen = () => {
    const { settings, annualData, updateActualBalance } = useAppContext();
    const [year, setYear] = useState(new Date().getFullYear());
    
    const yearData = annualData[year];

    useEffect(() => {
        if (!yearData) {
            const availableYears = Object.keys(annualData).map(Number).sort((a,b) => b-a);
            if (availableYears.length > 0) {
                setYear(availableYears[0]);
            }
        }
    }, [year, yearData, annualData]);

    const summaryData = useMemo(() => {
        if (!settings || !yearData) return [];

        let runningBalance = yearData.budget.startingBalance;

        return MONTH_NAMES.map((monthName, i) => {
            const monthlyTransactions = yearData.transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getUTCFullYear() === year && txDate.getUTCMonth() === i;
            });

            const income = monthlyTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);

            const expense = monthlyTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            runningBalance += income - expense;

            return {
                name: monthName,
                monthIndex: i,
                income,
                expense,
                calculatedBalance: runningBalance,
                actualBalance: yearData.actualBalances[i],
                plannedBalance: yearData.budget.plannedBalance[i]
            };
        });

    }, [settings, yearData, year]);


    const handleActualBalanceChange = (monthIndex, value) => {
        if (value === '') {
            updateActualBalance(year, monthIndex, null);
            return;
        }
        const balance = parseFloat(value);
        if (!isNaN(balance)) {
            updateActualBalance(year, monthIndex, balance);
        }
    };

    const availableYears = Object.keys(annualData).map(Number).sort((a,b) => b-a);

    if (!settings || availableYears.length === 0) {
        return (
            React.createElement(PageWrapper, { title: "年間集計" },
                React.createElement(Card, null, React.createElement("p", null, "データを表示するには、まず初期設定と年初設定を完了してください。 ", React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面へ")))
            )
        );
    }
     if (!yearData) {
        return (
            React.createElement(PageWrapper, { title: "年間集計" },
                React.createElement(Card, null, React.createElement("p", null, year, "年のデータがありません。 ", React.createElement(NavLink, { to: "/setup", className: "text-blue-500 hover:underline" }, "設定画面"), "で追加してください。"))
            )
        );
    }

    return (
        React.createElement(PageWrapper, { title: "年間集計" },
             React.createElement(Card, { className: "mb-6" },
                React.createElement("div", { className: "flex items-center gap-4" },
                    React.createElement(Select, { label: "対象年", value: year, onChange: e => setYear(Number(e.target.value)), className: "w-48" },
                        availableYears.map(y => React.createElement("option", { key: y, value: y }, y, "年"))
                    )
                )
            ),

            React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
                React.createElement(Card, null,
                    React.createElement("h3", { className: "text-xl font-bold mb-4" }, "月次収支グラフ"),
                    React.createElement(ResponsiveContainer, { width: "100%", height: 300 },
                        React.createElement(BarChart, { data: summaryData },
                            React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                            React.createElement(XAxis, { dataKey: "name" }),
                            React.createElement(YAxis, { tickFormatter: (val) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(val) }),
                            React.createElement(Tooltip, { formatter: (value) => formatCurrency(value) }),
                            React.createElement(Legend, null),
                            React.createElement(Bar, { dataKey: "income", fill: "#3b82f6", name: "収入" }),
                            React.createElement(Bar, { dataKey: "expense", fill: "#ef4444", name: "支出" })
                        )
                    )
                ),

                React.createElement(Card, null,
                    React.createElement("h3", { className: "text-xl font-bold mb-4" }, "残高推移グラフ"),
                    React.createElement(ResponsiveContainer, { width: "100%", height: 300 },
                        React.createElement(LineChart, { data: summaryData },
                            React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                            React.createElement(XAxis, { dataKey: "name" }),
                            React.createElement(YAxis, { tickFormatter: (val) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(val) }),
                            React.createElement(Tooltip, { formatter: (value) => formatCurrency(value)}),
                            React.createElement(Legend, null),
                            React.createElement(Line, { type: "monotone", dataKey: "plannedBalance", stroke: "#a0aec0", name: "計画残高", strokeDasharray: "5 5", dot: false }),
                            React.createElement(Line, { type: "monotone", dataKey: "calculatedBalance", stroke: "#4a90e2", name: "計算残高" }),
                            React.createElement(Line, { type: "monotone", dataKey: "actualBalance", stroke: "#50e3c2", name: "実績残高", connectNulls: true })
                        )
                    )
                )
            ),
            
            React.createElement(Card, { className: "mt-6" },
                React.createElement("h3", { className: "text-xl font-bold mb-4" }, "年間収支詳細"),
                 React.createElement("div", { className: "overflow-x-auto" },
                    React.createElement("table", { className: "w-full text-left whitespace-nowrap" },
                        React.createElement("thead", null,
                            React.createElement("tr", { className: "bg-gray-50 dark:bg-gray-700 text-sm" },
                                React.createElement("th", { className: "p-3 font-semibold" }, "月"),
                                React.createElement("th", { className: "p-3 font-semibold" }, "収入"),
                                React.createElement("th", { className: "p-3 font-semibold" }, "支出"),
                                React.createElement("th", { className: "p-3 font-semibold" }, "計算残高"),
                                React.createElement("th", { className: "p-3 font-semibold" }, "実績残高"),
                                React.createElement("th", { className: "p-3 font-semibold" }, "計画残高")
                            )
                        ),
                        React.createElement("tbody", null,
                            summaryData.map((d) => (
                                React.createElement("tr", { key: d.monthIndex, className: "border-b dark:border-gray-700" },
                                    React.createElement("td", { className: "p-3 font-medium" }, d.name),
                                    React.createElement("td", { className: "p-3 text-green-600" }, formatCurrency(d.income)),
                                    React.createElement("td", { className: "p-3 text-red-600" }, formatCurrency(d.expense)),
                                    React.createElement("td", { className: "p-3" }, formatCurrency(d.calculatedBalance)),
                                    React.createElement("td", { className: "p-3 w-40" },
                                         React.createElement(Input, {
                                            label: "",
                                            type: "number",
                                            value: d.actualBalance ?? '',
                                            onChange: e => handleActualBalanceChange(d.monthIndex, e.target.value),
                                            className: "w-full",
                                            placeholder: "実績残高..."
                                        })
                                    ),
                                    React.createElement("td", { className: "p-3 text-gray-500" }, formatCurrency(d.plannedBalance))
                                )
                            ))
                        )
                    )
                )
            )
        )
    );
};


const AppRoutes = () => {
    const { settings, annualData } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const hasAnnualData = Object.keys(annualData).length > 0;
        const currentPath = location.pathname;

        if (!settings && currentPath !== '/setup') {
            navigate('/setup', { replace: true });
        } else if (settings && !hasAnnualData && currentPath !== '/setup') {
            navigate('/setup', { replace: true });
        } else if (settings && hasAnnualData && (currentPath === '/' || currentPath === '/setup')) {
            navigate('/monthly', { replace: true });
        } else if (!settings && currentPath === '/') {
            navigate('/setup', {replace: true});
        }
    }, [settings, annualData, navigate, location.pathname]);

    return (
        React.createElement(Routes, null,
            React.createElement(Route, { path: "/setup", element: React.createElement(SetupScreen, null) }),
            React.createElement(Route, { path: "/monthly", element: React.createElement(MonthlyTrackerScreen, null) }),
            React.createElement(Route, { path: "/summary", element: React.createElement(AnnualSummaryScreen, null) }),
            React.createElement(Route, { path: "/", element: React.createElement(PageWrapper, { title: "読み込み中..." }, React.createElement(Card, null, React.createElement("p", null, "データを準備しています..."))) }),
            React.createElement(Route, { path: "*", element: React.createElement(PageWrapper, { title: "ページが見つかりません" }, React.createElement(Card, null, React.createElement("p", null, "お探しのページは見つかりませんでした。"))) })
        )
    );
};

const MainApp = () => {
    return (
        React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100" },
            React.createElement(Header, null),
            React.createElement(AppRoutes, null)
        )
    )
}

const App = () => {
  return (
    React.createElement(AppContextProvider, null,
        React.createElement(HashRouter, null,
            React.createElement(MainApp, null)
        )
    )
  );
};

export default App;
