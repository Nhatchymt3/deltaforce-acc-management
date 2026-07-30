'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PresetMilestone } from '@/lib/types';

export async function getPresetMilestones(): Promise<PresetMilestone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('preset_milestones')
    .select('id, level, price, note')
    .order('level', { ascending: true });

  if (error) {
    // If table doesn't exist yet, return fallback default list gracefully
    return [];
  }
  return (data ?? []) as PresetMilestone[];
}

export async function createPresetMilestone(level: number, price: string, note?: string): Promise<PresetMilestone> {
  const admin = createAdminClient();
  const cleanPrice = price.trim();
  if (!level || level <= 0) throw new Error('Level phải lớn hơn 0');
  if (!cleanPrice) throw new Error('Giá tiền không được để trống');

  const { data, error } = await admin
    .from('preset_milestones')
    .insert({ level, price: cleanPrice, note: note?.trim() || null })
    .select('id, level, price, note')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Mốc Level & Giá này đã tồn tại');
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/milestones');
  return data as PresetMilestone;
}

export async function updatePresetMilestone(id: string, level: number, price: string, note?: string): Promise<PresetMilestone> {
  const admin = createAdminClient();
  const cleanPrice = price.trim();
  if (!level || level <= 0) throw new Error('Level phải lớn hơn 0');
  if (!cleanPrice) throw new Error('Giá tiền không được để trống');

  const { data, error } = await admin
    .from('preset_milestones')
    .update({ level, price: cleanPrice, note: note?.trim() || null })
    .eq('id', id)
    .select('id, level, price, note')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Mốc Level & Giá này đã tồn tại');
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/milestones');
  return data as PresetMilestone;
}

export async function deletePresetMilestone(id: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('preset_milestones')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/milestones');
}
