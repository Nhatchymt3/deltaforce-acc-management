'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Source } from '@/lib/types';

export async function getSources(): Promise<Source[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sources')
    .select('id, name')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Source[];
}

export async function createSource(name: string): Promise<Source> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên nguồn không được để trống');

  const { data, error } = await supabase
    .from('sources')
    .insert({ name: trimmed })
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Nguồn này đã tồn tại');
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/sources');
  return data as Source;
}

export async function updateSource(id: string, name: string): Promise<Source> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên nguồn không được để trống');

  const { data, error } = await supabase
    .from('sources')
    .update({ name: trimmed })
    .eq('id', id)
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Nguồn này đã tồn tại');
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/sources');
  return data as Source;
}

export async function deleteSource(id: string): Promise<void> {
  const supabase = await createClient();

  // Check if any accounts reference this source
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('source', id)
    .limit(1);

  if (accounts && accounts.length > 0) {
    throw new Error('Không thể xóa: còn tài khoản thuộc nguồn này');
  }

  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/sources');
}
