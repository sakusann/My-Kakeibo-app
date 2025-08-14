import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MONTH_NAMES } from '../constants'; // Assuming constants.js is still there
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Initial Setup Component (Adapted from reference App.js) ---
const initialSetupSchema = z.object({
  monthlyIncome: z.coerce.number().min(0, "月収は0以上である必要があります。"),
  summerBonus: z.coerce.number().min(0, "夏季賞与は0以上である必要があります。"),
  winterBonus: z.coerce.number().min(0, "冬季賞与は0以上である必要があります。"),
  initialBalance: z.coerce.number().min(0, "初期残高は0以上である必要があります。"),
  incomeCategories: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "カテゴリ名は必須です。"),
  })),
  expenseCategories: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "カテゴリ名は必須です。"),
  })),
  summerBonusMonths: z.array(z.number().min(1).max(12)),
  winterBonusMonths: z.array(z.number().min(1).max(12)),
});

type InitialSetupFormValues = z.infer<typeof initialSetupSchema>;

interface Category {
  id: string;
  name: string;
}

interface CategoryEditorProps {
  title: string;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

const CategoryEditor = ({ title, categories, onCategoriesChange }: CategoryEditorProps) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const { toast } = useToast();

  const addCategory = () => {
    if (newCategoryName && newCategoryName.trim() !== '') {
      onCategoriesChange([...categories, { id: crypto.randomUUID(), name: newCategoryName.trim() }]);
      setNewCategoryName('');
    }
  };

  const removeCategory = (id: string) => {
    onCategoriesChange(categories.filter(c => c.id !== id));
  };

  const startEditing = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveEdit = () => {
    if (editingCategoryName.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'カテゴリ名は空にできません。',
      });
      return;
    }
    onCategoriesChange(categories.map(cat =>
      cat.id === editingCategoryId ? { ...cat, name: editingCategoryName.trim() } : cat
    ));
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const moveCategory = (index: number, direction: number) => {
    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(index, 1);
    newCategories.splice(index + direction, 0, movedItem);
    onCategoriesChange(newCategories);
  };

  return (
    <div>
      <Label className="text-lg font-medium">{title}</Label>
      <div className="space-y-2 mt-2">
        {categories.map((cat, index) => (
          <div key={cat.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {editingCategoryId === cat.id ? (
              <>
                <Input
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  className="flex-grow"
                />
                <Button type="button" size="icon" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveCategory(index, -1)} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                </div>
                <span className="flex-grow ml-2">{cat.name}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => startEditing(cat)}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          placeholder="新しいカテゴリ名"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-grow"
        />
        <Button type="button" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

interface InitialSetupProps {
  onComplete: () => void;
}

const InitialSetup = ({ onComplete }: InitialSetupProps) => {
  const { settings, saveSettings } = useAppContext();
  const { toast } = useToast();

  const form = useForm<InitialSetupFormValues>({
    resolver: zodResolver(initialSetupSchema),
    defaultValues: {
      monthlyIncome: settings?.monthlyIncome ?? 300000,
      summerBonus: settings?.summerBonus ?? 0,
      winterBonus: settings?.winterBonus ?? 0,
      initialBalance: settings?.initialBalance ?? 1000000,
      incomeCategories: settings?.incomeCategories ?? [
        { id: 'i1', name: '給与' },
        { id: 'i2', name: '賞与' },
        { id: 'i3', name: 'その他' },
      ],
      expenseCategories: settings?.expenseCategories ?? [{ id: 'c1', name: '食費' }, { id: 'c2', name: '住居費' }],
      summerBonusMonths: settings?.summerBonusMonths ?? [7],
      winterBonusMonths: settings?.winterBonusMonths ?? [12],
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        monthlyIncome: settings.monthlyIncome ?? 300000,
        summerBonus: settings.summerBonus ?? 0,
        winterBonus: settings.winterBonus ?? 0,
        initialBalance: settings.initialBalance ?? 1000000,
        incomeCategories: settings.incomeCategories ?? [
          { id: 'i1', name: '給与' },
          { id: 'i2', name: '賞与' },
          { id: 'i3', name: 'その他' },
        ],
        expenseCategories: settings.expenseCategories ?? [{ id: 'c1', name: '食費' }, { id: 'c2', name: '住居費' }],
        summerBonusMonths: settings.summerBonusMonths ?? [7],
        winterBonusMonths: settings.winterBonusMonths ?? [12],
      });
    }
  }, [settings, form.reset]);

  const toggleBonusMonth = (month: number, type: 'summer' | 'winter') => {
    const currentMonths = form.getValues(type === 'summer' ? 'summerBonusMonths' : 'winterBonusMonths');
    const setter = type === 'summer' ? 'summerBonusMonths' : 'winterBonusMonths';
    if (currentMonths.includes(month)) {
      form.setValue(setter, currentMonths.filter(m => m !== month).sort((a, b) => a - b));
    } else {
      form.setValue(setter, [...currentMonths, month].sort((a, b) => a - b));
    }
  };

  const onSubmit = async (values: InitialSetupFormValues) => {
    try {
      await saveSettings({
        monthlyIncome: values.monthlyIncome,
        summerBonus: values.summerBonus,
        winterBonus: values.winterBonus,
        initialBalance: values.initialBalance,
        incomeCategories: values.incomeCategories,
        expenseCategories: values.expenseCategories,
        summerBonusMonths: values.summerBonusMonths,
        winterBonusMonths: values.winterBonusMonths,
      });
      toast({
        title: '成功',
        description: '初期設定を保存しました。',
      });
      onComplete();
    } catch (error) {
      console.error("設定の保存に失敗:", error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '設定の保存に失敗しました。',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="monthlyIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>月収（手取り）</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>初期残高</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="summerBonus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>夏季賞与</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="winterBonus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>冬季賞与</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="incomeCategories"
          render={({ field }) => (
            <CategoryEditor
              title="収入カテゴリ"
              categories={field.value}
              onCategoriesChange={field.onChange}
            />
          )}
        />

        <FormField
          control={form.control}
          name="expenseCategories"
          render={({ field }) => (
            <CategoryEditor
              title="支出カテゴリ"
              categories={field.value}
              onCategoriesChange={field.onChange}
            />
          )}
        />

        <div>
          <Label className="text-lg font-medium">ボーナス月設定</Label>
          <div className="mb-4 mt-2">
            <Label className="text-md font-medium text-yellow-600 dark:text-yellow-400">夏季ボーナス月</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
              {MONTH_NAMES.map((name, index) => (
                <Button
                  key={`summer-${index}`}
                  type="button"
                  variant={form.watch('summerBonusMonths').includes(index + 1) ? 'default' : 'outline'}
                  onClick={() => toggleBonusMonth(index + 1, 'summer')}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-md font-medium text-sky-600 dark:text-sky-400">冬季ボーナス月</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
              {MONTH_NAMES.map((name, index) => (
                <Button
                  key={`winter-${index}`}
                  type="button"
                  variant={form.watch('winterBonusMonths').includes(index + 1) ? 'default' : 'outline'}
                  onClick={() => toggleBonusMonth(index + 1, 'winter')}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full">初期設定を保存</Button>
      </form>
    </Form>
  );
};

// --- Annual Setup Component (Adapted from reference App.js) ---
const annualSetupSchema = z.object({
  year: z.coerce.number(),
  startingBalance: z.coerce.number().min(0, "年初残高は0以上である必要があります。"),
  normalMonthBudget: z.record(z.string(), z.coerce.number().min(0, "予算は0以上である必要があります。")),
  bonusMonthBudget: z.record(z.string(), z.coerce.number().min(0, "予算は0以上である必要があります。")),
  plannedBalance: z.array(z.coerce.number().min(0, "計画残高は0以上である必要があります。")),
});

type AnnualSetupFormValues = z.infer<typeof annualSetupSchema>;

const AnnualSetup = () => {
  const { settings, annualData, saveAnnualData } = useAppContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('normal');

  const form = useForm<AnnualSetupFormValues>({
    resolver: zodResolver(annualSetupSchema),
    defaultValues: {
      year: year,
      startingBalance: annualData[year]?.budget?.startingBalance ?? settings?.initialBalance ?? 0,
      normalMonthBudget: annualData[year]?.budget?.normalMonthBudget ?? {},
      bonusMonthBudget: annualData[year]?.budget?.bonusMonthBudget ?? {},
      plannedBalance: annualData[year]?.budget?.plannedBalance ?? Array(12).fill(annualData[year]?.budget?.startingBalance ?? settings?.initialBalance ?? 0),
    },
  });

  useEffect(() => {
    if (settings) {
      const data = annualData[year];
      if (data) {
        form.reset({
          year: year,
          startingBalance: data.budget?.startingBalance ?? settings.initialBalance ?? 0,
          normalMonthBudget: data.budget?.normalMonthBudget ?? {},
          bonusMonthBudget: data.budget?.bonusMonthBudget ?? {},
          plannedBalance: data.budget?.plannedBalance ?? Array(12).fill(data.budget?.startingBalance ?? settings.initialBalance ?? 0),
        });
      } else {
        const createInitialBudget = () => settings.expenseCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: 0 }), {});
        const startingBalance = annualData[year - 1]?.actualBalances?.sort((a, b) => a.month - b.month).pop()?.balance ?? settings.initialBalance ?? 0;
        form.reset({
          year: year,
          startingBalance: startingBalance,
          normalMonthBudget: createInitialBudget(),
          bonusMonthBudget: createInitialBudget(),
          plannedBalance: Array(12).fill(startingBalance),
        });
      }
    }
  }, [year, annualData, settings, form.reset]);

  const handleBudgetChange = (type: 'normal' | 'bonus', categoryId: string, value: string) => {
    const budgetKey = type === 'normal' ? 'normalMonthBudget' : 'bonusMonthBudget';
    form.setValue(`${budgetKey}.${categoryId}`, parseFloat(value) || 0);
  };

  const handlePlannedBalanceChange = (monthIndex: number, value: string) => {
    const newPlannedBalance = [...form.getValues('plannedBalance')];
    newPlannedBalance[monthIndex] = parseFloat(value) || 0;
    form.setValue('plannedBalance', newPlannedBalance);
  };

  const onSubmit = async (values: AnnualSetupFormValues) => {
    try {
      await saveAnnualData(year, {
        budget: {
          year: values.year,
          startingBalance: values.startingBalance,
          normalMonthBudget: values.normalMonthBudget,
          bonusMonthBudget: values.bonusMonthBudget,
          plannedBalance: values.plannedBalance,
        },
        transactions: annualData[year]?.transactions || [],
        actualBalances: annualData[year]?.actualBalances || [],
      });
      toast({
        title: '成功',
        description: `${year}年の年間設定を保存しました。`,
      });
    } catch (error) {
      console.error("年間設定の保存に失敗:", error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '設定の保存に失敗しました。',
      });
    }
  };

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i), []);

  if (!settings) {
    return <p className="text-center text-sm text-gray-500">最初に初期設定を保存してください。</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem className="w-full sm:w-48">
                <FormLabel>対象年</FormLabel>
                <Select onValueChange={(val) => { setYear(Number(val)); field.onChange(Number(val)); }} defaultValue={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="年を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startingBalance"
            render={({ field }) => (
              <FormItem className="w-full sm:w-auto flex-grow">
                <FormLabel>年初残高</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Label className="text-lg font-medium">月次予算設定</Label>
          <div className="border-b border-border/50 mb-4 mt-2">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <Button type="button" variant="ghost" onClick={() => setActiveTab('normal')} className={`${activeTab === 'normal' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} whitespace-nowrap py-4 px-1 font-medium text-sm`}>通常月</Button>
              <Button type="button" variant="ghost" onClick={() => setActiveTab('bonus')} className={`${activeTab === 'bonus' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} whitespace-nowrap py-4 px-1 font-medium text-sm`}>ボーナス月</Button>
            </nav>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings?.expenseCategories?.map(cat => (
              <FormField
                key={cat.id}
                control={form.control}
                name={activeTab === 'normal' ? `normalMonthBudget.${cat.id}` : `bonusMonthBudget.${cat.id}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{cat.name}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="text-lg font-medium">年間残高計画</Label>
          <p className="text-sm text-muted-foreground mb-4">各月末に、口座にいくら残高があるかの計画値を入力します。年間集計グラフの「計画残高」として表示されます。</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {MONTH_NAMES.map((name, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`plannedBalance.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{name}末</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">年間設定を保存</Button>
      </form>
    </Form>
  );
};

// --- Setup Dialog Component ---
interface SetupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const SetupDialog = ({ isOpen, onOpenChange }: SetupDialogProps) => {
  const [activeTab, setActiveTab] = useState('initial'); // 'initial' or 'annual'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>アプリの初期設定</DialogTitle>
          <DialogDescription>
            アプリを使い始める前に、いくつかの設定を完了してください。
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="initial">初期設定</TabsTrigger>
            <TabsTrigger value="annual">年間設定</TabsTrigger>
          </TabsList>
          <TabsContent value="initial" className="mt-4">
            <InitialSetup onComplete={() => setActiveTab('annual')} />
          </TabsContent>
          <TabsContent value="annual" className="mt-4">
            <AnnualSetup />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
