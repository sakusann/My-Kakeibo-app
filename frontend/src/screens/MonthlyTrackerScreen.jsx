import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { FiPlus, FiChevronLeft, FiChevronRight, FiTrash2, FiEdit } from 'react-icons/fi';
import { FaWandMagicSparkles } from "react-icons/fa6";
import { MONTH_NAMES } from '../constants';

const TransactionForm = ({ onClose, editingTx }) => {
  const { settings, saveTransaction, geminiApiKey } = useAppContext();
  const [type, setType] = useState(editingTx?.type || 'expense');
  const [amount, setAmount] = useState(editingTx?.amount || '');
  const [description, setDescription] = useState(editingTx?.description || '');
  const [categoryId, setCategoryId] = useState(editingTx?.categoryId || '');
  const [date, setDate] = useState(editingTx?.date || new Date().toISOString().split('T')[0]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggestCategory = async () => {
    if (!description) return alert("カテゴリを提案するには、まず説明を入力してください。");
    if (!geminiApiKey) return alert("AI機能の準備ができていません。");
    
    setIsSuggesting(true);
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `取引内容：「${description}」。以下の支出カテゴリリストから最も適切なものを1つだけ選び、そのIDを返してください。\n\nカテゴリリスト（nameとid）:\n${JSON.stringify(settings.expenseCategories.map(({ id, name }) => ({ id, name })))} \n\n必ず指定されたカテゴリIDの中から選んでください。他の言葉は不要です。出力は{"categoryId": "ID"}のJSON形式でお願いします。`;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/{.*}/);
      if (jsonMatch) {
          const suggestedId = JSON.parse(jsonMatch[0]).categoryId;
          if (suggestedId && settings.expenseCategories.some(c => c.id === suggestedId)) {
            setCategoryId(suggestedId);
          } else {
            alert("AIは適切なカテゴリを見つけられませんでした。");
          }
      } else {
         alert("AIからの応答形式が不正です。");
      }
    } catch (error) {
      console.error("AIカテゴリ提案エラー:", error);
      alert("AIによるカテゴリ提案に失敗しました。");
    }
    setIsSuggesting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'expense' && !categoryId) {
        alert("支出カテゴリを選択してください。");
        return;
    }

    const transactionData = {
      id: editingTx?.id || `tx${Date.now()}`,
      type, amount: Number(amount), description,
      categoryId: type === 'expense' ? categoryId : '',
      date,
    };
    const year = new Date(date).getFullYear();
    try {
      await saveTransaction(transactionData, year);
      onClose();
    } catch (error) {
      console.error("取引の保存に失敗", error);
      alert("取引の保存に失敗しました。");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="種類" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="expense">支出</option>
        <option value="income">収入</option>
      </Select>
      <Input label="日付" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <Input label="金額" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="例: 1500" />
      <Input label="説明" type="text" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="例: スーパーで買い物" />
      
      {type === 'expense' && (
        <div className="space-y-2">
          <Select label="カテゴリ" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">カテゴリを選択...</option>
            {settings?.expenseCategories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>
          <Button type="button" onClick={handleSuggestCategory} disabled={isSuggesting} className="w-full bg-purple-600 hover:bg-purple-700">
            <FaWandMagicSparkles className="mr-2" />
            {isSuggesting ? "提案中..." : "AIでカテゴリを提案"}
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onClose} type="button" className="bg-slate-500 hover:bg-slate-600">キャンセル</Button>
        <Button type="submit">{editingTx ? '更新' : '追加'}</Button>
      </div>
    </form>
  );
};

const MonthlyTrackerScreen = () => {
  const { settings, annualData, deleteTransaction, loading } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };
  
  const monthlyTransactions = useMemo(() => {
    return annualData[year]?.transactions?.filter(tx => 
      new Date(tx.date).getUTCMonth() === month
    ) || [];
  }, [annualData, year, month]);

  const summary = useMemo(() => {
    const budgetData = annualData[year]?.budget || {};
    const totalBudget = Object.values(budgetData).reduce((sum, val) => sum + val, 0);
    const expensesByCategory = monthlyTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => {
      if(tx.categoryId) acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
      return acc;
    }, {});
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const remainingBudget = totalBudget - totalExpenses;
    return { totalBudget, totalExpenses, remainingBudget, expensesByCategory };
  }, [annualData, year, monthlyTransactions]);
  
  const categoryMap = useMemo(() => {
    if (!settings?.expenseCategories) return {};
    return settings.expenseCategories.reduce((map, cat) => {
      map[cat.id] = cat.name;
      return map;
    }, {});
  }, [settings]);

  const handleOpenModal = (tx = null) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };
  
  const handleDelete = async (tx) => {
    if (window.confirm(`「${tx.description}」を削除しますか？`)) {
      const txYear = new Date(tx.date).getFullYear();
      await deleteTransaction(tx.id, txYear);
    }
  };

  if (!loading && !settings) {
    return (
      <Card><p className="text-center">ようこそ！<br/>まずは「各種設定」ページで各種設定を完了してください。</p></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ★ タイトルスタイルを統一 */}
      <h2 className="text-3xl font-bold text-slate-800">月次記録</h2>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button onClick={() => changeMonth(-1)} className="w-auto px-3"><FiChevronLeft /></Button>
          <h3 className="text-2xl font-bold w-32 text-center text-slate-700">{`${year}年 ${MONTH_NAMES[month]}`}</h3>
          <Button onClick={() => changeMonth(1)} className="w-auto px-3"><FiChevronRight /></Button>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-auto">
          <FiPlus /> 収支を追加
        </Button>
      </div>

      <Card>
        <h3 className="text-lg font-medium text-slate-600">今月の残予算</h3>
        <p className={`text-5xl font-bold ${summary.remainingBudget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          {summary.remainingBudget.toLocaleString()}円
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {settings?.expenseCategories.map(cat => {
            const categoryBudget = annualData[year]?.budget?.[cat.id] || 0;
            const categoryExpenses = summary.expensesByCategory[cat.id] || 0;
            const remaining = categoryBudget - categoryExpenses;
            const remainingColor = remaining >= 0 ? 'text-blue-700' : 'text-red-700';
            return (
              <div key={cat.id} className="p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600">{cat.name}</p>
                <p className={`text-lg font-semibold ${remainingColor}`}>{remaining.toLocaleString()}円</p>
                <p className="text-xs text-slate-500">予算: {categoryBudget.toLocaleString()}円</p>
              </div>
            );
          })}
        </div>
      </Card>
      
      <Card>
        <h3 className="text-xl font-bold mb-4 text-slate-700">今月の収支一覧</h3>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
          {monthlyTransactions.length > 0 ? (
            monthlyTransactions.map(tx => (
              <div key={tx.id} className="flex items-center p-3 rounded-lg bg-slate-50">
                <div className="flex-grow">
                  <p className="font-semibold text-slate-800">{tx.description}</p>
                  <p className="text-sm text-slate-500">
                    {tx.date}
                    {tx.type === 'expense' && ` (${categoryMap[tx.categoryId] || '未分類'})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-lg ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}
                    {tx.amount.toLocaleString()}円
                  </p>
                  <Button onClick={() => handleOpenModal(tx)} className="!w-auto p-2 bg-slate-500 hover:bg-slate-600" title="編集"><FiEdit /></Button>
                  <Button onClick={() => handleDelete(tx)} className="!w-auto p-2 bg-red-500 hover:bg-red-600" title="削除"><FiTrash2 /></Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 py-4">今月の取引はまだありません。</p>
          )}
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTx ? "取引を編集" : "新しい取引"}>
        <TransactionForm onClose={handleCloseModal} editingTx={editingTx} />
      </Modal>
    </div>
  );
};

export default MonthlyTrackerScreen;