'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, handleActionError } from '@/lib/auth-guard';
import type { PresetMilestone } from '@/lib/types';
import { z } from 'zod';

const uuidSchema = z.string().uuid('ID không hợp lệ');

export async function getPresetMilestones(): Promise<PresetMilestone[]> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('preset_milestones')
      .select('id, level, price, note')
      .order('level', { ascending: true });

    if (error) {
      return [];
    }
    return (data ?? []) as PresetMilestone[];
  } catch (error) {
    handleActionError(error);
  }
}

export async function createPresetMilestone(level: number, price: string, note?: string): Promise<PresetMilestone> {
  try {
    await requireAuth();
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
  } catch (error) {
    handleActionError(error);
  }
}

export async function updatePresetMilestone(id: string, level: number, price: string, note?: string): Promise<PresetMilestone> {
  try {
    await requireAuth();
    const validatedId = uuidSchema.parse(id);
    const admin = createAdminClient();
    const cleanPrice = price.trim();
    if (!level || level <= 0) throw new Error('Level phải lớn hơn 0');
    if (!cleanPrice) throw new Error('Giá tiền không được để trống');

    const { data, error } = await admin
      .from('preset_milestones')
      .update({ level, price: cleanPrice, note: note?.trim() || null })
      .eq('id', validatedId)
      .select('id, level, price, note')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Mốc Level & Giá này đã tồn tại');
      throw new Error(error.message);
    }

    revalidatePath('/');
    revalidatePath('/milestones');
    return data as PresetMilestone;
  } catch (error) {
    handleActionError(error);
  }
}

export async function deletePresetMilestone(id: string): Promise<void> {
  try {
    await requireAuth();
    const validatedId = uuidSchema.parse(id);
    const admin = createAdminClient();

    const { error } = await admin
      .from('preset_milestones')
      .delete()
      .eq('id', validatedId);

    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/milestones');
  } catch (error) {
    handleActionError(error);
  }
}
