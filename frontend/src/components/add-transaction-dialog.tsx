"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
// ▼▼▼ Firebase Functionsのライブラリをインポート ▼▼▼
import { getFunctions, httpsCallable } from 'firebase/functions';
// ▼▼▼ このファイルはもう不要なので削除 ▼▼▼
// import { getSmartCategory } from '@/actions/transactions'; 
import { TransactionCategories } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const formSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: 'Please select a transaction type.' }),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  category: z.string().min(1, 'Category is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddTransactionDialog({ userId, isOpen, onOpenChange }: AddTransactionDialogProps) {
  const { toast } = useToast();
  const [isCategorizing, setIsCategorizing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
      description: '',
      amount: 0,
    },
  });

  const transactionType = form.watch('type');

  // ▼▼▼ handleSmartCategorize関数の中身をCloud Function呼び出しに書き換え ▼▼▼
  const handleSmartCategorize = async () => {
    const description = form.getValues('description');
    if (!description) {
      toast({ variant: 'destructive', title: 'Please enter a description first.' });
      return;
    }
    setIsCategorizing(true);
    try {
      // 1. Cloud Functionを初期化
      const functions = getFunctions();
      const getSmartCategoryFunc = httpsCallable(functions, 'getSmartCategory');

      // 2. Cloud Functionを呼び出し、結果を受け取る
      const response = await getSmartCategoryFunc({ description });
      const suggestedCategory = response.data.category as string;
      
      // 3. 結果をフォームにセット
      // 推測されたカテゴリが選択肢に存在するか確認
      const availableCategories = TransactionCategories[transactionType];
      if (suggestedCategory && availableCategories.includes(suggestedCategory)) {
        form.setValue('category', suggestedCategory);
        toast({ title: 'Success', description: `Categorized as ${suggestedCategory}.` });
      } else {
        // 存在しない場合は'Other'に設定（あるいは何もしない）
        form.setValue('category', 'Other');
        toast({ title: 'Suggestion', description: `Suggested "${suggestedCategory}", but set to "Other".` });
      }

    } catch (error) {
      console.error('Error fetching smart category:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch a category suggestion.' });
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
        category: values.category,
      });
      toast({
        title: 'Success!',
        description: 'Your transaction has been added.',
      });
      form.reset({ // resetする際にもデフォルト値を再設定
        type: 'expense',
        date: new Date(),
        description: '',
        amount: 0,
      });
      onOpenChange(false);
    } catch (error) {
       console.error("Error adding transaction:", error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving your transaction.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Enter the details of your new transaction below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
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
                        <FormLabel className="font-normal">Expense</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Income</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="e.g., Coffee with friends" {...field} />
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
                    <FormLabel>Amount</FormLabel>
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
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TransactionCategories[transactionType]?.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Save Transaction</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}