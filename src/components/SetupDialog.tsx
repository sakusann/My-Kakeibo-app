// src/components/SetupDialog.tsx

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '../contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import { Settings, AnnualData, RecurringPayment } from '../types';
import { generateCategoryId, generateId } from '../lib/utils';
import { X, Copy, PlusCircle, Trash2 } from 'lucide-react';

interface SetupDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

// ★★★ここからが修正の核心です★★★
// 空の文字列やnull/undefinedを0に変換するZodプリプロセッサ
const emptyStringToZero = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? 0 : val),
  z.coerce.number().min(0, "0以上の数値を入力してください。")
);

const paydaySettingsSchema = z.object({ payday: z.coerce.number().min(1).max(31), rollover: z.enum(['before', 'after']), });
const initialSetupSchema = z.object({ monthlyIncome: emptyStringToZero, initialBalance: emptyStringToZero, paydaySettings: paydaySettingsSchema, });
const categorySchema = z.object({ id: z.string(), name: z.string().min(1, 'カテゴリ名は必須です'), });
const categoriesSchema = z.object({ incomeCategories: z.array(categorySchema), expenseCategories: z.array(categorySchema), });
const recurringPaymentSchema = z.object({ id: z.string(), title: z.string().min(1, 'タイトルは必須です'), amount: z.coerce.number().min(1, '金額は必須です'), paymentDay: z.coerce.number().min(1).max(31), categoryId: z.string().min(1, 'カテゴリは必須です'), type: z.enum(['income', 'expense']), });

const annualBudgetSchema = z.object({
    startingBalance: emptyStringToZero,
    plannedBalance: z.array(emptyStringToZero),
    // recordをz.string()でキー指定することで、あらゆるカテゴリIDに対応
    normalMonthBudget: z.record(z.string(), emptyStringToZero),
    bonusMonthBudget: z.record(z.string(), emptyStringToZero),
});
// ★★★ここまでが修正の核心です★★★


export default function SetupDialog({ open, onOpenChange }: SetupDialogProps) {
    const { settings, annualData, recurringPayments, saveSettings, saveAnnualBudget, saveRecurringPayments } = useAppContext();
    const [activeTab, setActiveTab] = useState('initial');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>設定</DialogTitle>
                    <DialogDescription>アプリの各種設定を行います。</DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex gap-6 overflow-hidden mt-4">
                    <nav className="w-1/4 border-r pr-6">
                        <ul className="space-y-2">
                            {['initial', 'annual', 'categories', 'recurring'].map(tab => (
                                <li key={tab}>
                                    <Button type="button" variant={activeTab === tab ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab(tab)}>
                                        { {initial: '基本設定', annual: '年間予算', categories: 'カテゴリ', recurring: '定期支払い'}[tab] }
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="w-3/4 overflow-y-auto pr-2">
                        {activeTab === 'initial' && <InitialSetupForm settings={settings} onSave={saveSettings} />}
                        {activeTab === 'annual' && <AnnualSetupForm settings={settings} annualData={annualData} onSave={saveAnnualBudget} year={selectedYear} setYear={setSelectedYear} />}
                        {activeTab === 'categories' && <CategoriesSetupForm settings={settings} onSave={saveSettings} />}
                        {activeTab === 'recurring' && <RecurringPaymentsForm settings={settings} recurringPayments={recurringPayments} onSave={saveRecurringPayments} />}
                    </div>
                </div>
                 <DialogFooter className="mt-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AnnualSetupForm({ settings, annualData, onSave, year, setYear }: { settings: Settings | null, annualData: AnnualData | null, onSave: Function, year: string, setYear: Function }) {
    const { toast } = useToast();
    const { handleSubmit, register, getValues, setValue, reset } = useForm({
        // ★★★ zodResolverを復活させ、バリデーションを有効化 ★★★
        resolver: zodResolver(annualBudgetSchema),
    });
    
    // ★★★ useEffectの依存配列からsettingsを削除し、残高の連動を断ち切る ★★★
    useEffect(() => {
        const data = annualData?.[year]?.budget;
        // 年が初めて設定される場合、前年の最終計画残高 or 基本設定の残高を引き継ぐ賢い初期値を設定
        let initialStartingBalance = settings?.initialBalance || 0;
        if (data?.startingBalance) {
            initialStartingBalance = data.startingBalance;
        } else if (annualData?.[String(parseInt(year) - 1)]) {
            const prevYearData = annualData[String(parseInt(year) - 1)];
            initialStartingBalance = prevYearData.budget.plannedBalance[11] || prevYearData.budget.startingBalance;
        }

        reset({
            startingBalance: initialStartingBalance,
            plannedBalance: data?.plannedBalance || Array(12).fill(0),
            normalMonthBudget: data?.normalMonthBudget || {},
            bonusMonthBudget: data?.bonusMonthBudget || {},
        });
    }, [year, annualData, reset, settings?.initialBalance]); // settings全体ではなく、initialBalanceのみに依存

    const onSubmit = async (data: any) => {
         try {
            await onSave(year, data);
            toast({ title: "成功", description: `${year}年の年間設定を保存しました。` });
        } catch(e) {
            console.error("年間予算の保存エラー:", e);
            toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" });
        }
    };
    
    const onError = (errors: any) => {
        console.error("フォームのバリデーションエラー:", errors);
        toast({ title: "入力エラー", description: "入力内容に誤りがあります。0以上の数値を入力してください。", variant: "destructive" });
    };

    const copyBudget = () => {
        const normalValues = getValues('normalMonthBudget');
        setValue('bonusMonthBudget', normalValues, { shouldDirty: true });
        toast({ title: 'コピーしました', description: '通常月の予算をボーナス月のフォームにコピーしました。' });
    }

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
             <div className="flex items-center gap-4">
                <h3 className="font-semibold text-lg">年間予算設定</h3>
                <Select value={year} onValueChange={(v) => setYear(v)}>
                    <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div><Label>年初残高</Label><Input type="number" placeholder="0" {...register('startingBalance')} /></div>
            <div>
                <h4 className="font-semibold mb-2">カテゴリ別予算</h4>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><h5 className="font-medium text-center">通常月</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                            {settings?.expenseCategories.map(cat => ( <div key={cat.id} className="flex items-center gap-2"> <Label className="w-1/2 text-sm">{cat.name}</Label> <Input type="number" className="h-8" placeholder="0" {...register(`normalMonthBudget.${cat.id}`)} /> </div> ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-center items-center gap-2"><h5 className="font-medium">ボーナス月</h5><Button type="button" size="sm" variant="outline" onClick={copyBudget}><Copy className="w-3 h-3 mr-1"/>コピー</Button></div>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                            {settings?.expenseCategories.map(cat => ( <div key={cat.id} className="flex items-center gap-2"> <Label className="w-1/2 text-sm">{cat.name}</Label> <Input type="number" className="h-8" placeholder="0" {...register(`bonusMonthBudget.${cat.id}`)} /> </div> ))}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2">月末計画残高</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => ( <div key={i} className="flex items-center gap-2"> <Label className="w-16">{i + 1}月</Label> <Input type="number" placeholder="0" {...register(`plannedBalance.${i}`)} /> </div> ))}
                </div>
            </div>
            <div className="flex justify-end"><Button type="submit">保存</Button></div>
        </form>
    );
}
function InitialSetupForm({ settings, onSave }: { settings: Settings | null, onSave: Function }) {
    const { toast } = useToast();
    const { handleSubmit, register, control, reset } = useForm({
        resolver: zodResolver(initialSetupSchema),
    });
    useEffect(() => { reset({ monthlyIncome: settings?.monthlyIncome || 0, initialBalance: settings?.initialBalance || 0, paydaySettings: settings?.paydaySettings || { payday: 25, rollover: 'before' }, }); }, [settings, reset]);
    const onSubmit = async (data: any) => { try { await onSave(data); toast({ title: "成功", description: "基本設定を保存しました。" }); } catch(e) { toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); } };
    const onError = () => { toast({ title: "入力エラー", description: "入力内容を確認してください。", variant: "destructive" }); };
    return ( <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4"> <h3 className="font-semibold text-lg">基本設定</h3> <div><Label>月収 (手取り)</Label><Input type="number" placeholder="0" {...register('monthlyIncome')} /></div> <div><Label>現在の残高</Label><Input type="number" placeholder="0" {...register('initialBalance')} /></div> <div> <Label>給料日</Label> <Controller name="paydaySettings.payday" control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/> </div> <div> <Label>給料日が休日の場合</Label> <Controller name="paydaySettings.rollover" control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> <SelectItem value="before">前営業日</SelectItem> <SelectItem value="after">後営業日</SelectItem> </SelectContent> </Select> )}/> </div> <div className="flex justify-end"><Button type="submit">保存</Button></div> </form> );
}
function CategoriesSetupForm({ settings, onSave } : { settings: Settings | null, onSave: Function }){
    const { toast } = useToast();
    const { control, register, handleSubmit, reset } = useForm({ resolver: zodResolver(categoriesSchema), });
    useEffect(() => { reset({ incomeCategories: settings?.incomeCategories || [], expenseCategories: settings?.expenseCategories || [], }); }, [settings, reset]);
    const { fields: incomeFields, append: appendIncome, remove: removeIncome } = useFieldArray({ control, name: "incomeCategories" });
    const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenseCategories" });
    const onSubmit = async (data: any) => { try { await onSave(data); toast({ title: "成功", description: "カテゴリを保存しました。" }); } catch(e) { toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); } };
    const renderCategoryList = (title: string, fields: Record<"id", string>[], append: Function, remove: Function, fieldName: "incomeCategories" | "expenseCategories") => ( <div> <h4 className="font-semibold mb-2">{title}</h4> <div className="space-y-2"> {fields.map((field, index) => ( <div key={field.id} className="flex items-center gap-2"> <Input {...register(`${fieldName}.${index}.name`)} /> <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}> <Trash2 className="h-4 w-4" /> </Button> </div> ))} </div> <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: generateCategoryId(), name: '' })}> <PlusCircle className="h-4 w-4 mr-2" /> 追加 </Button> </div> );
    return ( <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> <h3 className="font-semibold text-lg">カテゴリ設定</h3> {renderCategoryList("収入カテゴリ", incomeFields, appendIncome, removeIncome, "incomeCategories")} {renderCategoryList("支出カテゴリ", expenseFields, appendExpense, removeExpense, "expenseCategories")} <div className="flex justify-end"><Button type="submit">保存</Button></div> </form> );
}
function RecurringPaymentsForm({ settings, recurringPayments, onSave }: { settings: Settings | null, recurringPayments: RecurringPayment[], onSave: Function }) {
    const { toast } = useToast();
    const { control, handleSubmit, register, reset, watch } = useForm({ defaultValues: { payments: recurringPayments || [] } });
    useEffect(() => { reset({ payments: recurringPayments || [] }); }, [recurringPayments, reset]);
    const { fields, append, remove } = useFieldArray({ control, name: "payments" });
    const onSubmit = async (data: any) => {
        const validated = z.array(recurringPaymentSchema).safeParse(data.payments);
        if (!validated.success) { toast({ title: "入力エラー", description: "必須項目を確認してください。", variant: "destructive" }); return; }
        try { await onSave(validated.data); toast({ title: "成功", description: "定期的な支払いを保存しました。" });
        } catch(e) { toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); }
    };
    return ( <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> <h3 className="font-semibold text-lg">定期的な支払いの設定</h3> <div className="space-y-4"> {fields.map((item, index) => { const type = watch(`payments.${index}.type`); const categories = type === 'income' ? settings?.incomeCategories : settings?.expenseCategories; return ( <div key={item.id} className="p-4 border rounded-lg space-y-2 relative"> <div className="absolute top-2 right-2"> <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}> <Trash2 className="h-4 w-4 text-muted-foreground" /> </Button> </div> <div className="grid grid-cols-2 gap-4"> <div> <Label>種別</Label> <Controller name={`payments.${index}.type`} control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> <SelectItem value="expense">支出</SelectItem> <SelectItem value="income">収入</SelectItem> </SelectContent> </Select> )}/> </div> <div> <Label>カテゴリ</Label> <Controller name={`payments.${index}.categoryId`} control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger><SelectValue placeholder="選択..."/></SelectTrigger> <SelectContent> {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)} </SelectContent> </Select> )}/> </div> <div className="col-span-2"> <Label>タイトル</Label> <Input {...register(`payments.${index}.title`)} placeholder="家賃、サブスクなど" /> </div> <div> <Label>金額</Label> <Input type="number" {...register(`payments.${index}.amount`)} /> </div> <div> <Label>支払日 (毎月)</Label> <Controller name={`payments.${index}.paymentDay`} control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/> </div> </div> </div> ); })} </div> <Button type="button" variant="outline" className="mt-2" onClick={() => append({ id: generateId(), title: '', amount: 0, paymentDay: 25, categoryId: '', type: 'expense'})}> <PlusCircle className="h-4 w-4 mr-2" /> 定期支払いを追加 </Button> <div className="flex justify-end pt-4"><Button type="submit">保存</Button></div> </form> );
}