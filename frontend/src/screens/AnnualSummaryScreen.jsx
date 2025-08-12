import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MONTH_NAMES } from '../constants';
import Card from '../components/Card';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { FaWandMagicSparkles } from "react-icons/fa6";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const formatCurrency = (value) => new Intl.NumberFormat('ja-JP').format(value);

const MarkdownRenderer = ({ text }) => {
    if (!text) return null;
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
    return <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: html }} />;
};

const AnnualSummaryScreen = () => {
  const { settings, annualData, updateActualBalance, loading, geminiApiKey } = useAppContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [insightContent, setInsightContent] = useState('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const summaryData = useMemo(() => {
    const yearData = annualData[year];
    if (!settings || !yearData) return [];

    return MONTH_NAMES.map((monthName, i) => {
      const monthlyTransactions = yearData.transactions?.filter(tx => new Date(tx.date).getUTCMonth() === i) || [];
      const income = monthlyTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const expense = monthlyTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      const actualBalanceRecord = yearData.actualBalances?.find(b => b.month === i);
      return {
        name: monthName, monthIndex: i, income, expense,
        actualBalance: actualBalanceRecord ? actualBalanceRecord.balance : null,
      };
    });
  }, [settings, annualData, year]);
  
  const handleGetInsights = async () => {
    if (!geminiApiKey) return alert("AI機能の準備ができていません。");
    
    setIsInsightModalOpen(true);
    setIsInsightLoading(true);
    setInsightContent('');
    try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const formattedSummary = summaryData.map(d => `- ${d.name}: 収入 ${formatCurrency(d.income)}, 支出 ${formatCurrency(d.expense)}, 実績残高 ${d.actualBalance ? formatCurrency(d.actualBalance) + '円' : '未入力'}`).join('\n');
        const prompt = `あなたは経験豊富なファイナンシャルプランナーです。以下の日本のユーザーの${year}年の家計簿データを見て、支出のパターンを分析し、改善のための具体的なアドバイスをフレンドリーな口調で提供してください。\n\n# 家計簿データ\n${formattedSummary}\n\n# 指示\n1. 全体をレビューし、まず何か一つポジティブな点を褒めてください。\n2. 次に、支出が特に多い月や、改善できそうな点を客観的に指摘してください。\n3. 最後に、貯蓄を増やすための、具体的で実行可能な改善案を3つ提案してください。\n\n# 出力形式\n- 箇条書きや太字（**テキスト**）を効果的に使って、視覚的に分かりやすいMarkdown形式で記述してください。`;
        
        const result = await model.generateContent(prompt);
        setInsightContent(result.response.text());
    } catch (error) {
        console.error("AIインサイト生成エラー:", error);
        setInsightContent("分析に失敗しました。しばらくしてから再度お試しください。");
    }
    setIsInsightLoading(false);
  };
  
  const handleActualBalanceChange = (monthIndex, value) => {
      const balance = value === '' ? null : Number(value);
       if (value !== '' && isNaN(balance)) {
             return;
        }
      updateActualBalance(year, monthIndex, balance);
  };

    if (!loading && !settings) {
        return (
        <Card><p className="text-center">ようこそ！<br/>まずは「各種設定」ページで各種設定を完了してください。</p></Card>
        );
    }
    return (
    <div className="space-y-6">
      {/* ★ タイトルスタイルを統一 */}
      <h2 className="text-3xl font-bold text-slate-800">年間集計</h2>
      
      <Card>
        <div className="flex justify-between items-center">
            <label className="font-semibold text-slate-700">対象年: {year}</label>
            <Button onClick={handleGetInsights} disabled={isInsightLoading} className="w-auto bg-purple-600 hover:bg-purple-700">
              <FaWandMagicSparkles />
              <span className="ml-2">{isInsightLoading ? "分析中..." : "AIで支出を分析"}</span>
            </Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-bold mb-4 text-slate-700">月次収支グラフ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summaryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={formatCurrency} /><Tooltip formatter={(value) => `${formatCurrency(value)}円`} /><Legend /><Bar dataKey="income" fill="#22c55e" name="収入" /><Bar dataKey="expense" fill="#ef4444" name="支出" /></BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-xl font-bold mb-4 text-slate-700">実績残高推移グラフ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={summaryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={formatCurrency} /><Tooltip formatter={(value) => `${formatCurrency(value)}円`} /><Legend /><Line type="monotone" dataKey="actualBalance" stroke="#3b82f6" name="実績残高" strokeWidth={2} connectNulls={true} /></LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-4 text-slate-700">年間収支詳細</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-sm">
                <th className="p-3 font-semibold">月</th><th className="p-3 font-semibold">収入</th><th className="p-3 font-semibold">支出</th><th className="p-3 font-semibold">実績残高 (月末時点)</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map(d => (
                <tr key={d.monthIndex} className="border-b border-slate-200">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-green-600 font-semibold">{formatCurrency(d.income)}円</td>
                  <td className="p-3 text-red-600 font-semibold">{formatCurrency(d.expense)}円</td>
                  <td className="p-3 w-48"><Input label="" type="number" placeholder="月末残高を入力..." value={d.actualBalance ?? ''} onChange={(e) => handleActualBalanceChange(d.monthIndex, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isInsightModalOpen} onClose={() => setIsInsightModalOpen(false)} title="AIによる家計分析">
          {isInsightLoading ? (
              <div className="flex justify-center items-center h-48"><p>分析データを生成中...</p></div>
          ) : (
              <div className="max-h-[60vh] overflow-y-auto pr-2"><MarkdownRenderer text={insightContent} /></div>
          )}
      </Modal>
    </div>
  );
};
export default AnnualSummaryScreen;