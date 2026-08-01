'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, handleActionError } from '@/lib/auth-guard';
import type { Source } from '@/lib/types';
import { z } from 'zod';

const sourceNameSchema = z.string().trim().min(1, 'Tên nguồn không được để trống').max(50, 'Tên nguồn quá dài');
const uuidSchema = z.string().uuid('ID không hợp lệ');

export async function getSources(): Promise<Source[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from('sources')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return (data ?? []) as Source[];
  } catch (error) {
    handleActionError(error);
  }
}

export async function createSource(name: string): Promise<Source> {
  try {
    const { supabase } = await requireAuth();
    const trimmed = sourceNameSchema.parse(name);

    const { data, error } = await supabase
      .from('sources')
      .insert({ name: trimmed })
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Nguồn này đã tồn tại');
      throw error;
    }

    revalidatePath('/sources');
    return data as Source;
  } catch (error) {
    handleActionError(error);
  }
}

export async function updateSource(id: string, name: string): Promise<Source> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);
    const trimmed = sourceNameSchema.parse(name);

    const { data, error } = await supabase
      .from('sources')
      .update({ name: trimmed })
      .eq('id', validatedId)
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Nguồn này đã tồn tại');
      throw error;
    }

    revalidatePath('/sources');
    return data as Source;
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteSource(id: string): Promise<void> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('source', validatedId)
      .limit(1);

    if (accounts && accounts.length > 0) {
      throw new Error('Không thể xóa: còn tài khoản thuộc nguồn này');
    }

    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', validatedId);

    if (error) throw error;

    revalidatePath('/sources');
  } catch (error) {
    handleActionError(error);
  }
}
