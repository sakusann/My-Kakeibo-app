import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { useToast } from './ui/use-toast';
import { cn } from '../lib/utils';


const transactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    date: z.date({ required_error: "日付は必須です。" }),
    description: z.string().min(1, "内容は必須です。"),
    amount: z.coerce.number().min(1, "金額は1以上で入力してください。"),
    category: z.string().min(1, "カテゴリは必須です。"),
    tags: z.array(z.string()).optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
    const { currentUser } = useAuthContext();
    const { settings } = useAppContext();
    const { toast } = useToast();
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [tagInput, setTagInput] = useState('');
    
    const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            date: new Date(),
            description: '',
            amount: 0,
            tags: [],
        },
    });
    
    const tags = watch('tags') || [];

    useEffect(() => {
        setValue('type', transactionType);
        setValue('category', '');
    }, [transactionType, setValue]);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (!tags.includes(newTag)) {
                setValue('tags', [...tags, newTag]);
            }
            setTagInput('');
        }
    };
    
    const removeTag = (tagToRemove: string) => {
        setValue('tags', tags.filter(tag => tag !== tagToRemove));
    };

    const onSubmit = async (data: TransactionFormData) => {
        if (!currentUser) return;

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
                ...data,
                userId: currentUser.uid,
                date: Timestamp.fromDate(data.date),
                createdAt: Timestamp.now(),
            });
            toast({ title: "成功", description: "取引を登録しました。" });
            reset();
            setTransactionType('expense'); // Reset type toggle
            onOpenChange(false);
        } catch (error) {
            console.error("取引の追加エラー:", error);
            toast({ title: "エラー", description: "取引の登録に失敗しました。", variant: 'destructive' });
        }
    };

    const categories = transactionType === 'income' ? settings?.incomeCategories : settings?.expenseCategories;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新しい取引を追加</DialogTitle>
                    <DialogDescription>収入または支出の詳細を入力してください。</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex gap-2">
                        <Button type="button" onClick={() => setTransactionType('expense')} variant={transactionType === 'expense' ? 'default' : 'outline'} className="w-full">支出</Button>
                        <Button type="button" onClick={() => setTransactionType('income')} variant={transactionType === 'income' ? 'default' : 'outline'} className="w-full">収入</Button>
                    </div>

                    <div>
                        <Label htmlFor="date">日付</Label>
                        <Controller
                            name="date"
                            control={control}
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, 'PPP', {locale: ja}) : <span>日付を選択</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                            locale={ja}
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                         {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="description">内容</Label>
                        <Input id="description" {...register('description')} />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="amount">金額</Label>
                        <Input id="amount" type="number" {...register('amount')} />
                        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="category">カテゴリ</Label>
                         <Controller
                            name="category"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="カテゴリを選択..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="tags">タグ (Enterで追加)</Label>
                        <Input 
                            id="tags" 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map(tag => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit">保存</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}