// src/components/AddTransactionDialog.tsx

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { useToast } from './ui/use-toast';
import { cn } from '../lib/utils';
import { Transaction } from '../types';

const PRIMARY        = '#3347B0';
const INCOME_COLOR   = '#1E9E6B';
const EXPENSE_COLOR  = '#E05535';
const INCOME_BG      = '#EDFAF3';
const EXPENSE_BG     = '#FEF2EF';
const BORDER         = '#EAECF0';
const MUTED          = '#A0A7B4';

const transactionSchema = z.object({
  type:        z.enum(['income', 'expense']),
  date:        z.date({ required_error: '日付は必須です。' }),
  description: z.string().min(1, '内容は必須です。'),
  amount:      z.coerce.number().min(1, '金額は1以上で入力してください。'),
  category:    z.string().min(1, 'カテゴリは必須です。'),
  tags:        z.array(z.string()).optional(),
});
type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
}

export default function AddTransactionDialog({ open, onOpenChange, transactionToEdit }: AddTransactionDialogProps) {
  const { currentUser } = useAuthContext();
  const { settings, updateTransaction } = useAppContext();
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState('');
  const isEditMode = !!transactionToEdit;

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const tags            = watch('tags') || [];
  const transactionType = watch('type');
  const amount          = watch('amount');
  const category        = watch('category');

  const isIncomeMode = transactionType === 'income';
  const accentColor  = isIncomeMode ? INCOME_COLOR : EXPENSE_COLOR;
  const accentBg     = isIncomeMode ? INCOME_BG : EXPENSE_BG;

  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      reset({ ...transactionToEdit, date: parseISO(transactionToEdit.date) });
    } else {
      reset({ type: 'expense', date: new Date(), description: '', amount: 0, tags: [], category: '' });
    }
  }, [transactionToEdit, open, reset]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) setValue('tags', [...tags, newTag]);
      setTagInput('');
    }
  };
  const removeTag = (tag: string) => setValue('tags', tags.filter(t => t !== tag));

  const onSubmit = async (data: TransactionFormData) => {
    if (!currentUser) return;
    try {
      const tsDate = Timestamp.fromDate(data.date);
      if (isEditMode && transactionToEdit) {
        await updateTransaction(transactionToEdit.id, { ...data, userId: currentUser.uid, date: tsDate });
        toast({ title: '成功', description: '取引を更新しました。' });
      } else {
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
          ...data, userId: currentUser.uid, date: tsDate, createdAt: Timestamp.now(),
        });
        toast({ title: '成功', description: '取引を登録しました。' });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('保存エラー:', error);
      toast({ title: 'エラー', description: '保存に失敗しました。', variant: 'destructive' });
    }
  };

  const categories = transactionType === 'income'
    ? settings?.incomeCategories
    : settings?.expenseCategories;

  const canSave = !isSubmitting && !!category && (amount ?? 0) >= 1 && !!watch('description');

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)' }}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
        />

        {/* Bottom sheet */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed', bottom: 0,
            left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 520,
            maxHeight: '92vh', overflowY: 'auto',
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            zIndex: 51,
            paddingBottom: 32,
          }}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
        >
          {/* Grip bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#DADDE3' }} />
          </div>

          {/* Close */}
          <DialogPrimitive.Close
            style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </DialogPrimitive.Close>

          {/* Title */}
          <DialogPrimitive.Title style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1A1D2E' }}>
            {isEditMode ? '取引を編集' : '新しい取引を追加'}
          </DialogPrimitive.Title>

          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '0 20px' }}>
            {/* Type toggle */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                  {(['expense', 'income'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { field.onChange(t); setValue('category', ''); }}
                      style={{
                        flex: 1, padding: '9px', border: 'none', borderRadius: 9, cursor: 'pointer',
                        fontWeight: 600, fontSize: 14,
                        background: field.value === t ? (t === 'income' ? INCOME_BG : EXPENSE_BG) : 'transparent',
                        color: field.value === t ? (t === 'income' ? INCOME_COLOR : EXPENSE_COLOR) : MUTED,
                        transition: 'all 0.15s',
                      }}
                    >
                      {t === 'expense' ? '支出' : '収入'}
                    </button>
                  ))}
                </div>
              )}
            />

            {/* Amount */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>金額</label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: accentColor }}>¥</span>
                <input
                  type="number"
                  {...register('amount')}
                  style={{
                    fontSize: 28, fontWeight: 700, border: 'none', outline: 'none',
                    color: accentColor, background: 'transparent', width: '100%',
                    borderBottom: `2px solid ${accentColor}40`,
                    paddingBottom: 4,
                  }}
                  placeholder="0"
                />
              </div>
              {errors.amount && <p style={{ fontSize: 12, color: EXPENSE_COLOR, marginTop: 4 }}>{errors.amount.message}</p>}
            </div>

            {/* Category chips */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>カテゴリ</label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {categories?.map(cat => {
                      const active = field.value === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => field.onChange(cat.id)}
                          style={{
                            padding: '6px 14px', borderRadius: 99,
                            border: `2px solid ${active ? accentColor : BORDER}`,
                            background: active ? accentBg : '#fff',
                            color: active ? accentColor : '#6B7280',
                            fontWeight: active ? 600 : 400,
                            fontSize: 13, cursor: 'pointer',
                            transition: 'all 0.12s',
                          }}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.category && <p style={{ fontSize: 12, color: EXPENSE_COLOR, marginTop: 4 }}>{errors.category.message}</p>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>内容</label>
              <input
                {...register('description')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, outline: 'none' }}
                placeholder="例: スーパー、給与"
              />
              {errors.description && <p style={{ fontSize: 12, color: EXPENSE_COLOR, marginTop: 4 }}>{errors.description.message}</p>}
            </div>

            {/* Date */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>日付</label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 10,
                          border: `1px solid ${BORDER}`, background: '#fff',
                          fontSize: 14, textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          color: field.value ? '#1A1D2E' : MUTED,
                        }}
                      >
                        <CalendarIcon size={15} />
                        {field.value ? format(field.value, 'PPP', { locale: ja }) : '日付を選択'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ja} />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>タグ（Enterで追加）</label>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, outline: 'none' }}
                placeholder="固定費、外食…"
              />
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, background: '#EEF2FF', color: PRIMARY, borderRadius: 6, padding: '2px 8px' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: PRIMARY, display: 'flex', padding: 0 }}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={!canSave}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: canSave ? `linear-gradient(140deg, ${PRIMARY}, ${PRIMARY}BB)` : '#DADDE3',
                color: canSave ? '#fff' : '#A0A7B4',
                fontWeight: 700, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s',
              }}
            >
              {isSubmitting ? '保存中...' : isEditMode ? '変更を保存' : '取引を追加'}
            </button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
