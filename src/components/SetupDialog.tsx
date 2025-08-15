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
import { Settings, AnnualData, RecurringPayment, AnnualBudget } from '../types';
import { generateCategoryId, generateId } from '../lib/utils';
import { X, Copy, PlusCircle, Trash2, ChevronUp, ChevronDown } from 'lucide-react'; // ★ アイコン追加
import { MONTH_NAMES } from '../constants';

interface SetupDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

// (スキーマ定義は変更なし)
const emptyStringToZero = z.preprocess( (val) => (val === "" || val === null || val === undefined ? 0 : val), z.coerce.number().min(0, "0以上の数値を入力してください。") );
const paydaySettingsSchema = z.object({ payday: z.coerce.number().min(1).max(31), rollover: z.enum(['before', 'after']), });
const initialSetupSchema = z.object({ initialBalance: emptyStringToZero, paydaySettings: paydaySettingsSchema, });
const categorySchema = z.object({ id: z.string(), name: z.string().min(1, 'カテゴリ名は必須です'), });
const categoriesSchema = z.object({ incomeCategories: z.array(categorySchema), expenseCategories: z.array(categorySchema), });
const recurringPaymentSchema = z.object({ id: z.string(), title: z.string().min(1, 'タイトルは必須です'), amount: z.coerce.number().min(1, '金額は必須です'), paymentDay: z.coerce.number().min(1).max(31), categoryId: z.string().min(1, 'カテゴリは必須です'), type: z.enum(['income', 'expense']), isSystemGenerated: z.boolean().optional(), });
const annualSetupSchema = z.object({
    startingBalance: emptyStringToZero,
    paydaySettings: paydaySettingsSchema.optional(),
    plannedBalance: z.array(emptyStringToZero),
    normalMonthBudget: z.record(z.string(), emptyStringToZero),
    bonusMonthBudget: z.record(z.string(), emptyStringToZero),
    monthlyIncome: emptyStringToZero,
    summerBonus: emptyStringToZero,
    winterBonus: emptyStringToZero,
    summerBonusMonths: z.array(z.number()),
    winterBonusMonths: z.array(z.number()),
    summerBonusPayday: z.coerce.number().min(1).max(31),
    winterBonusPayday: z.coerce.number().min(1).max(31),
});

export default function SetupDialog({ open, onOpenChange }: SetupDialogProps) {
    const { settings, annualData, recurringPayments, saveSettings, saveAnnualBudget, saveRecurringPayments } = useAppContext();
    const [activeTab, setActiveTab] = useState('annual');
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
                            {['annual', 'categories', 'recurring'].map(tab => ( <li key={tab}> <Button type="button" variant={activeTab === tab ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab(tab)}> { {annual: '年間設定', categories: 'カテゴリ', recurring: '定期支払い'}[tab] } </Button> </li> ))}
                        </ul>
                    </nav>
                    <div className="w-3/4 overflow-y-auto pr-2">
                        {activeTab === 'annual' && <AnnualSetupForm settings={settings} annualData={annualData} onSaveAnnual={saveAnnualBudget} onSaveSettings={saveSettings} year={selectedYear} setYear={setSelectedYear} recurringPayments={recurringPayments} saveRecurringPayments={saveRecurringPayments} />}
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

function AnnualSetupForm({ settings, annualData, onSaveAnnual, onSaveSettings, year, setYear, recurringPayments, saveRecurringPayments }: { settings: Settings | null, annualData: AnnualData | null, onSaveAnnual: Function, onSaveSettings: Function, year: string, setYear: Function, recurringPayments: RecurringPayment[], saveRecurringPayments: Function }) {
    const { toast } = useToast();
    const { handleSubmit, register, getValues, setValue, reset, watch, control } = useForm({
        resolver: zodResolver(annualSetupSchema),
    });

    useEffect(() => {
        const data = annualData?.[year]?.budget;
        let initialStartingBalance = settings?.initialBalance || 0;
        if (data?.startingBalance) { initialStartingBalance = data.startingBalance; } 
        else if (annualData?.[String(parseInt(year) - 1)]) { const prevYearData = annualData[String(parseInt(year) - 1)]; initialStartingBalance = prevYearData.budget.plannedBalance[11] || prevYearData.budget.startingBalance; }
        
        reset({
            startingBalance: initialStartingBalance,
            paydaySettings: settings?.paydaySettings || { payday: 25, rollover: 'before' },
            plannedBalance: data?.plannedBalance || Array(12).fill(0),
            normalMonthBudget: data?.normalMonthBudget || {},
            bonusMonthBudget: data?.bonusMonthBudget || {},
            monthlyIncome: data?.monthlyIncome || 0,
            summerBonus: data?.summerBonus || 0,
            winterBonus: data?.winterBonus || 0,
            summerBonusMonths: data?.summerBonusMonths || [7],
            winterBonusMonths: data?.winterBonusMonths || [12],
            summerBonusPayday: data?.summerBonusPayday || 10,
            winterBonusPayday: data?.winterBonusPayday || 10,
        });
    }, [year, annualData, settings, reset]);

    const onSubmit = async (data: any) => {
         try {
            await onSaveSettings({ 
                initialBalance: data.startingBalance,
                paydaySettings: data.paydaySettings,
            });
            await onSaveAnnual(year, {
                startingBalance: data.startingBalance,
                plannedBalance: data.plannedBalance,
                normalMonthBudget: data.normalMonthBudget,
                bonusMonthBudget: data.bonusMonthBudget,
                monthlyIncome: data.monthlyIncome,
                summerBonus: data.summerBonus,
                winterBonus: data.winterBonus,
                summerBonusMonths: data.summerBonusMonths,
                winterBonusMonths: data.winterBonusMonths,
                summerBonusPayday: data.summerBonusPayday,
                winterBonusPayday: data.winterBonusPayday,
            });
            const salaryCategoryId = settings?.incomeCategories.find(c => c.name === '給与')?.id;
            const bonusCategoryId = settings?.incomeCategories.find(c => c.name === '賞与')?.id;
            const userPayments = recurringPayments.filter(p => !p.isSystemGenerated);
            const systemPayments: RecurringPayment[] = [];
            if (data.monthlyIncome > 0 && salaryCategoryId && data.paydaySettings?.payday) {
                systemPayments.push({ id: `sys_salary_${year}`, title: `${year}年 月収`, amount: data.monthlyIncome, paymentDay: data.paydaySettings.payday, categoryId: salaryCategoryId, type: 'income', isSystemGenerated: true });
            }
            if (data.summerBonus > 0 && bonusCategoryId && data.summerBonusMonths.length > 0) {
                 systemPayments.push({ id: `sys_sbonus_${year}`, title: `${year}年 夏季賞与`, amount: data.summerBonus, paymentDay: data.summerBonusPayday, categoryId: bonusCategoryId, type: 'income', isSystemGenerated: true });
            }
            if (data.winterBonus > 0 && bonusCategoryId && data.winterBonusMonths.length > 0) {
                 systemPayments.push({ id: `sys_wbonus_${year}`, title: `${year}年 冬季賞与`, amount: data.winterBonus, paymentDay: data.winterBonusPayday, categoryId: bonusCategoryId, type: 'income', isSystemGenerated: true });
            }
            await saveRecurringPayments([...userPayments, ...systemPayments]);
            toast({ title: "成功", description: `${year}年の設定を保存しました。` });
        } catch(e) { console.error("年間設定の保存エラー:", e); toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); }
    };
    
    const onError = (errors: any) => { console.error("フォームのバリデーションエラー:", errors); toast({ title: "入力エラー", description: "入力内容に誤りがあります。0以上の数値を入力してください。", variant: "destructive" }); };
    const copyBudget = () => { const normalValues = getValues('normalMonthBudget'); setValue('bonusMonthBudget', normalValues, { shouldDirty: true }); toast({ title: 'コピーしました' }); }
    const toggleBonusMonth = (month: number, type: 'summer' | 'winter') => {
        const fieldName = type === 'summer' ? 'summerBonusMonths' : 'winterBonusMonths';
        const currentMonths = getValues(fieldName);
        const newMonths = currentMonths.includes(month) ? currentMonths.filter((m: number) => m !== month) : [...currentMonths, month];
        setValue(fieldName, newMonths.sort((a,b) => a - b), { shouldDirty: true });
    };
    const summerBonusMonths = watch('summerBonusMonths') || [];
    const winterBonusMonths = watch('winterBonusMonths') || [];

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
             <div className="flex items-center gap-4"><h3 className="font-semibold text-lg">年間設定</h3><Select value={year} onValueChange={(v) => setYear(v)}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>)}</SelectContent></Select></div>
             <div>
                <h4 className="font-semibold mb-2">基本設定</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                    <div><Label>年初残高 (この年の開始時点)</Label><Input type="number" placeholder="0" {...register('startingBalance')} /></div><div/>
                    <div><Label>給料日</Label><Controller name="paydaySettings.payday" control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent className="max-h-60"> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/></div>
                    <div><Label>給料日が休日の場合</Label><Controller name="paydaySettings.rollover" control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> <SelectItem value="before">前営業日</SelectItem> <SelectItem value="after">後営業日</SelectItem> </SelectContent> </Select> )}/></div>
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2">収入設定 ({year}年)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                    <div><Label>月収 (手取り)</Label><Input type="number" placeholder="0" {...register('monthlyIncome')} /></div><div/>
                    <div className="grid grid-cols-2 gap-2"><div><Label>夏季賞与</Label><Input type="number" placeholder="0" {...register('summerBonus')} /></div><div><Label>支給日</Label><Controller name="summerBonusPayday" control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent className="max-h-60"> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/></div></div>
                    <div className="grid grid-cols-2 gap-2"><div><Label>冬季賞与</Label><Input type="number" placeholder="0" {...register('winterBonus')} /></div><div><Label>支給日</Label><Controller name="winterBonusPayday" control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent className="max-h-60"> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/></div></div>
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2">ボーナス支給月</h4>
                <div className="p-4 border rounded-md space-y-4">
                    <div><Label>夏季ボーナス月</Label><div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">{MONTH_NAMES.map((name, index) => ( <Button key={`summer-${index}`} type="button" variant={summerBonusMonths.includes(index + 1) ? 'default' : 'outline'} onClick={() => toggleBonusMonth(index + 1, 'summer')}>{name}</Button> ))}</div></div>
                    <div><Label>冬季ボーナス月</Label><div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">{MONTH_NAMES.map((name, index) => ( <Button key={`winter-${index}`} type="button" variant={winterBonusMonths.includes(index + 1) ? 'default' : 'outline'} onClick={() => toggleBonusMonth(index + 1, 'winter')}>{name}</Button> ))}</div></div>
                </div>
            </div>
            <div><h4 className="font-semibold mb-2">カテゴリ別支出予算</h4><div className="grid grid-cols-2 gap-6"><div className="space-y-2"><h5 className="font-medium text-center">通常月</h5><div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">{settings?.expenseCategories.map(cat => ( <div key={cat.id} className="flex items-center gap-2"> <Label className="w-1/2 text-sm">{cat.name}</Label> <Input type="number" className="h-8" placeholder="0" {...register(`normalMonthBudget.${cat.id}`)} /> </div> ))}</div></div><div className="space-y-2"><div className="flex justify-center items-center gap-2"><h5 className="font-medium">ボーナス月</h5><Button type="button" size="sm" variant="outline" onClick={copyBudget}><Copy className="w-3 h-3 mr-1"/>コピー</Button></div><div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">{settings?.expenseCategories.map(cat => ( <div key={cat.id} className="flex items-center gap-2"> <Label className="w-1/2 text-sm">{cat.name}</Label> <Input type="number" className="h-8" placeholder="0" {...register(`bonusMonthBudget.${cat.id}`)} /> </div> ))}</div></div></div></div>
            <div><h4 className="font-semibold mb-2">月末計画残高</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{Array.from({ length: 12 }, (_, i) => ( <div key={i} className="flex items-center gap-2"> <Label className="w-16">{i + 1}月</Label> <Input type="number" placeholder="0" {...register(`plannedBalance.${i}`)} /> </div> ))}</div></div>
            <div className="flex justify-end"><Button type="submit">保存</Button></div>
        </form>
    );
}

function CategoriesSetupForm({ settings, onSave } : { settings: Settings | null, onSave: Function }){
    const { toast } = useToast();
    const { control, register, handleSubmit, reset } = useForm({
        resolver: zodResolver(categoriesSchema),
    });
    useEffect(() => {
        reset({
            incomeCategories: settings?.incomeCategories || [],
            expenseCategories: settings?.expenseCategories || [],
        });
    }, [settings, reset]);

    // ★★★ `swap`関数をuseFieldArrayから取得 ★★★
    const { fields: incomeFields, append: appendIncome, remove: removeIncome, swap: swapIncome } = useFieldArray({ control, name: "incomeCategories" });
    const { fields: expenseFields, append: appendExpense, remove: removeExpense, swap: swapExpense } = useFieldArray({ control, name: "expenseCategories" });

    const onSubmit = async (data: any) => {
         try { await onSave(data); toast({ title: "成功", description: "カテゴリを保存しました。" });
        } catch(e) { toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); }
    };
    
    const renderCategoryList = (title: string, fields: Record<"id", string>[], append: Function, remove: Function, swap: Function, fieldName: "incomeCategories" | "expenseCategories") => (
        <div>
            <h4 className="font-semibold mb-2">{title}</h4>
            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        {/* ★★★ここからが修正箇所です★★★ */}
                        <div className="flex flex-col">
                            <Button type="button" variant="ghost" size="icon" className="h-5" disabled={index === 0} onClick={() => swap(index, index - 1)}><ChevronUp className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-5" disabled={index === fields.length - 1} onClick={() => swap(index, index + 1)}><ChevronDown className="h-4 w-4" /></Button>
                        </div>
                        <Input {...register(`${fieldName}.${index}.name`)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}> <Trash2 className="h-4 w-4" /> </Button>
                        {/* ★★★ここまでが修正箇所です★★★ */}
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: generateCategoryId(), name: '' })}> <PlusCircle className="h-4 w-4 mr-2" /> 追加 </Button>
        </div>
    );
    return ( <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> <h3 className="font-semibold text-lg">カテゴリ設定</h3> {renderCategoryList("収入カテゴリ", incomeFields, appendIncome, removeIncome, swapIncome, "incomeCategories")} {renderCategoryList("支出カテゴリ", expenseFields, appendExpense, removeExpense, swapExpense, "expenseCategories")} <div className="flex justify-end"><Button type="submit">保存</Button></div> </form> );
}
function RecurringPaymentsForm({ settings, recurringPayments, onSave }: { settings: Settings | null, recurringPayments: RecurringPayment[], onSave: Function }) { const { toast } = useToast(); const { control, handleSubmit, register, reset, watch } = useForm({ defaultValues: { payments: recurringPayments || [] } }); useEffect(() => { reset({ payments: recurringPayments || [] }); }, [recurringPayments, reset]); const { fields, append, remove } = useFieldArray({ control, name: "payments" }); const onSubmit = async (data: any) => { const validated = z.array(recurringPaymentSchema).safeParse(data.payments); if (!validated.success) { toast({ title: "入力エラー", description: "必須項目を確認してください。", variant: "destructive" }); return; } try { const systemPayments = recurringPayments.filter(p => p.isSystemGenerated); const userPayments = validated.data.filter(p => !p.isSystemGenerated); await onSave([...systemPayments, ...userPayments]); toast({ title: "成功", description: "定期的な支払いを保存しました。" }); } catch(e) { toast({ title: "エラー", description: "保存に失敗しました。", variant: "destructive" }); } }; return ( <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> <h3 className="font-semibold text-lg">定期的な支払いの設定</h3> <div className="space-y-4"> {fields.map((item, index) => { const type = watch(`payments.${index}.type`); const categories = type === 'income' ? settings?.incomeCategories : settings?.expenseCategories; return ( <div key={item.id} className="p-4 border rounded-lg space-y-2 relative"> <div className="absolute top-2 right-2"> <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={item.isSystemGenerated}> <Trash2 className="h-4 w-4 text-muted-foreground" /> </Button> </div> <div className="grid grid-cols-2 gap-4"> <div> <Label>種別</Label> <Controller name={`payments.${index}.type`} control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value} disabled={item.isSystemGenerated}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent> <SelectItem value="expense">支出</SelectItem> <SelectItem value="income">収入</SelectItem> </SelectContent> </Select> )}/> </div> <div> <Label>カテゴリ</Label> <Controller name={`payments.${index}.categoryId`} control={control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value} disabled={item.isSystemGenerated}> <SelectTrigger><SelectValue placeholder="選択..."/></SelectTrigger> <SelectContent> {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)} </SelectContent> </Select> )}/> </div> <div className="col-span-2"> <Label>タイトル</Label> <Input {...register(`payments.${index}.title`)} placeholder="家賃、サブスクなど" disabled={item.isSystemGenerated} /> </div> <div> <Label>金額</Label> <Input type="number" {...register(`payments.${index}.amount`)} disabled={item.isSystemGenerated} /> </div> <div> <Label>支払日 (毎月)</Label> <Controller name={`payments.${index}.paymentDay`} control={control} render={({ field }) => ( <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)} disabled={item.isSystemGenerated}> <SelectTrigger><SelectValue/></SelectTrigger> <SelectContent className="max-h-60"> {Array.from({length: 31}, (_, i) => i + 1).map(day => <SelectItem key={day} value={String(day)}>{day}日</SelectItem>)} </SelectContent> </Select> )}/> </div> </div> </div> ); })} </div> <Button type="button" variant="outline" className="mt-2" onClick={() => append({ id: generateId(), title: '', amount: 0, paymentDay: 25, categoryId: '', type: 'expense'})}> <PlusCircle className="h-4 w-4 mr-2" /> 定期支払いを追加 </Button> <div className="flex justify-end pt-4"><Button type="submit">保存</Button></div> </form> ); }