import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { MONTH_NAMES } from '../constants';

// 参照アプリで使われていたアイコンをreact-iconsで再現
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SettingsScreen = () => {
  const { settings, saveSettings, loading } = useAppContext();
  
  // 参照アプリの全てのフォーム項目をstateとして定義
  const [monthlyIncome, setMonthlyIncome] = useState(300000);
  const [summerBonus, setSummerBonus] = useState(0);
  const [winterBonus, setWinterBonus] = useState(0);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [summerBonusMonths, setSummerBonusMonths] = useState([7]);
  const [winterBonusMonths, setWinterBonusMonths] = useState([12]);
  
  // カテゴリ編集用のstate
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Firestoreから読み込んだデータをフォームに反映
  useEffect(() => {
    if (settings) {
      setMonthlyIncome(settings.monthlyIncome ?? 300000);
      setSummerBonus(settings.summerBonus ?? 0);
      setWinterBonus(settings.winterBonus ?? 0);
      setCategories(settings.expenseCategories ?? []);
      setSummerBonusMonths(settings.summerBonusMonths ?? [7]);
      setWinterBonusMonths(settings.winterBonusMonths ?? [12]);
    }
  }, [settings]);

  // カテゴリ追加
  const addCategory = () => {
    if (newCategoryName.trim() === '') return;
    setCategories([...categories, { id: `c${Date.now()}`, name: newCategoryName.trim() }]);
    setNewCategoryName('');
  };
  
  // カテゴリ削除
  const removeCategory = (id) => {
    setCategories(categories.filter(c => c.id !== id));
  };
  
  // カテゴリ編集開始
  const startEditing = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  // カテゴリ編集保存
  const saveEdit = () => {
    setCategories(categories.map(cat => 
        cat.id === editingCategoryId ? { ...cat, name: editingCategoryName.trim() } : cat
    ));
    setEditingCategoryId(null);
  };
  
  // カテゴリ並び替え
  const moveCategory = (index, direction) => {
      const newCategories = [...categories];
      const [movedItem] = newCategories.splice(index, 1);
      newCategories.splice(index + direction, 0, movedItem);
      setCategories(newCategories);
  };

  // ボーナス月選択
  const toggleBonusMonth = (month, type) => {
    const currentMonths = type === 'summer' ? summerBonusMonths : winterBonusMonths;
    const setMonths = type === 'summer' ? setSummerBonusMonths : setWinterBonusMonths;
    if (currentMonths.includes(month)) {
      setMonths(currentMonths.filter(m => m !== month).sort((a,b)=>a-b));
    } else {
      setMonths([...currentMonths, month].sort((a,b)=>a-b));
    }
  };

  // 全設定を保存
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveSettings({ 
        monthlyIncome: Number(monthlyIncome), 
        summerBonus: Number(summerBonus),
        winterBonus: Number(winterBonus),
        expenseCategories: categories,
        summerBonusMonths,
        winterBonusMonths,
      });
      alert('設定を保存しました。');
    } catch(error) {
      console.error("設定の保存に失敗:", error);
      alert("設定の保存に失敗しました。");
    }
  };

  if (loading) return <p>設定情報を読み込んでいます...</p>;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-800">各種設定</h2>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="月収（手取り）" type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} required />
              <Input label="夏季賞与" type="number" value={summerBonus} onChange={e => setSummerBonus(e.target.value)} />
              <Input label="冬季賞与" type="number" value={winterBonus} onChange={e => setWinterBonus(e.target.value)} />
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">支出カテゴリ</h3>
            <div className="space-y-2">
              {categories.map((cat, index) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
                  {editingCategoryId === cat.id ? (
                    <>
                      <Input label="" type="text" value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} />
                      <Button onClick={saveEdit} type="button" className="!w-auto p-2 bg-green-500 hover:bg-green-600"><FiCheck /></Button>
                      <Button onClick={() => setEditingCategoryId(null)} type="button" className="!w-auto p-2 bg-slate-400 hover:bg-slate-500"><FiX /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                          <button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0} className="disabled:opacity-25"><FiChevronUp /></button>
                          <button type="button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className="disabled:opacity-25"><FiChevronDown /></button>
                      </div>
                      <span className="flex-grow ml-2">{cat.name}</span>
                      <Button onClick={() => startEditing(cat)} type="button" className="!w-auto p-2 bg-transparent text-blue-600 hover:bg-blue-100"><FiEdit /></Button>
                      <Button onClick={() => removeCategory(cat.id)} type="button" className="!w-auto p-2 bg-transparent text-red-600 hover:bg-red-100"><FiTrash2 /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input label="" type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="新しいカテゴリ名" />
              <Button onClick={addCategory} type="button" className="w-auto px-4 self-end"><FiPlus /></Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">ボーナス月設定</h3>
            <div className="mb-4">
              <h4 className="text-md font-medium text-yellow-600 mb-2">夏季ボーナス月</h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTH_NAMES.map((name, index) => (
                  <label key={`s-${index}`} className={`flex items-center justify-center p-2 border rounded-md cursor-pointer transition-colors ${summerBonusMonths.includes(index + 1) ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-slate-100 border-slate-200'}`}>
                    <input type="checkbox" checked={summerBonusMonths.includes(index + 1)} onChange={() => toggleBonusMonth(index + 1, 'summer')} className="sr-only" />
                    {name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-sky-600 mb-2">冬季ボーナス月</h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTH_NAMES.map((name, index) => (
                  <label key={`w-${index}`} className={`flex items-center justify-center p-2 border rounded-md cursor-pointer transition-colors ${winterBonusMonths.includes(index + 1) ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 border-slate-200'}`}>
                    <input type="checkbox" checked={winterBonusMonths.includes(index + 1)} onChange={() => toggleBonusMonth(index + 1, 'winter')} className="sr-only" />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />
          <Button type="submit" className="w-full">設定を保存</Button>
        </form>
      </Card>

      {/* 年初設定は複雑なので、一旦別のステップで実装します */}
    </div>
  );
};

export default SettingsScreen;