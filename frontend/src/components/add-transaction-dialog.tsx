"use client";

import * as React from 'react';
import { useState, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
// ▼▼▼ Firebase Functionsのライブラリをインポート ▼▼▼
import { getFunctions, httpsCallable } from 'firebase/functions';
// ▼▼▼ このファイルはもう不要なので削除 ▼▼▼
import { useAppContext } from '@/context/AppContext.tsx';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const formSchema = z.object({
  type: z.enum(['income', 'expense'], { message: '取引種別を選択してください。' }),
  date: z.date({ message: '日付を入力してください。' }),
  description: z.string().min(1, '内容を入力してください。'),
  amount: z.coerce.number().positive('金額は0より大きい値を入力してください。'),
  category: z.string().min(1, 'カテゴリを選択してください。'),
  categoryDetail: z.string().optional(),
});

// 曜日ラベルをweekStartsOnに合わせて動的に並べるヘルパー関数
const getWeekdaysJa = (weekStartsOn: number = 0) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days.slice(weekStartsOn).concat(days.slice(0, weekStartsOn));
};

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddTransactionDialog({ userId, isOpen, onOpenChange }: AddTransactionDialogProps) {
  const { settings } = useAppContext();
  const { toast } = useToast();
  const [isCategorizing, setIsCategorizing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
      description: '',
      amount: 0,
      category: '', // カテゴリの初期値を空に
      categoryDetail: '',
    },
  });

  const transactionType = form.watch('type');

  // ▼▼▼ handleSmartCategorize関数の中身をCloud Function呼び出しに書き換え ▼▼▼
  const handleSmartCategorize = async () => {
    const description = form.getValues('description');
    if (!description) {
      toast({ variant: 'destructive', title: '先に内容を入力してください。' });
      return;
    }
    setIsCategorizing(true);
    try {
      // 1. Cloud Functionを初期化
      const functions = getFunctions();
      const getSmartCategoryFunc = httpsCallable(functions, 'getSmartCategory');

      // 2. Cloud Functionを呼び出し、結果を受け取る
      const response = await getSmartCategoryFunc({ description });
      const suggestedCategory = (response.data as { category?: string })?.category ?? '';
      
      // 3. 結果をフォームにセット
      // 推測されたカテゴリが選択肢に存在するか確認
      const availableCategories = (transactionType === 'income' 
        ? settings?.incomeCategories 
        : settings?.expenseCategories
      )?.map(c => c.name) ?? [];

      if (suggestedCategory && availableCategories.includes(suggestedCategory)) {
        form.setValue('category', suggestedCategory);
        toast({ title: '成功', description: `${suggestedCategory} に分類しました。` });
      } else {
        // 存在しない場合は'その他'に設定
        form.setValue('category', 'その他');
        toast({ title: '提案', description: `「${suggestedCategory || 'カテゴリ不明'}」と推測されましたが、「その他」に設定しました。` });
      }

    } catch (error) {
      console.error('Error fetching smart category:', error);
      toast({ variant: 'destructive', title: 'エラー', description: 'カテゴリの提案を取得できませんでした。' });
    } finally {
      setIsCategorizing(false);
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    try {
      await addDoc(collection(db, `users/${userId}/transactions`), {
        userId,
        type: values.type,
        date: format(values.date, 'yyyy-MM-dd'), // Format date to string
        description: values.description,
        amount: values.amount,
        category: values.category === 'その他' && values.categoryDetail ? values.categoryDetail : values.category,
      });
      toast({
        title: '成功しました！',
        description: '取引が追加されました。',
      });
      form.reset({ // resetする際にもデフォルト値を再設定
        type: 'expense',
        date: new Date(),
        description: '',
        amount: 0,
        category: '',
        categoryDetail: '',
      });
      onOpenChange(false);
    } catch (error) {
       console.error("Error adding transaction:", error);
      toast({
        variant: 'destructive',
        title: 'エラーが発生しました',
        description: '取引の保存中に問題が発生しました。',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>取引を追加</DialogTitle>
          <DialogDescription>新しい取引の詳細を入力してください。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>取引タイプ</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        form.setValue('category', ''); // タイプが変わったらカテゴリをリセット
                      }}
                      defaultValue={field.value}
                      className="flex items-center space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">支出</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">収入</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="例：友人とカフェ" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={handleSmartCategorize} disabled={isCategorizing}>
                      <Sparkles className={cn("size-4", isCategorizing && "animate-spin")} />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>金額</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>日付</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'yyyy年M月d日', { locale: ja }) : <span>日付を選択</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ja}
                          weekStartsOn={0} // 週の開始を日曜に
                          weekdayFormat="short"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>カテゴリ</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(transactionType === 'expense'
                        ? settings?.expenseCategories
                        : settings?.incomeCategories
                      )?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                      {/* 「その他」を手動で追加 */}
                      <SelectItem value="その他">その他（手入力可）</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* 「その他」が選択された場合は手入力欄を表示 */}
                  {field.value === 'その他' && (
                    <div className="mt-2">
                      <Input
                        placeholder="カテゴリ詳細を入力"
                        value={form.getValues('categoryDetail') || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => form.setValue('categoryDetail', e.target.value)}
                      />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}