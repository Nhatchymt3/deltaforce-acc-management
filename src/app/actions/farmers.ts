'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, handleActionError } from '@/lib/auth-guard';
import type { Farmer } from '@/lib/types';
import { z } from 'zod';

const farmerNameSchema = z.string().trim().min(1, 'Tên AE không được để trống').max(50, 'Tên AE quá dài');
const uuidSchema = z.string().uuid('ID không hợp lệ');

export async function getFarmers(): Promise<Farmer[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from('farmers')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return (data ?? []) as Farmer[];
  } catch (error) {
    handleActionError(error);
  }
}

export async function createFarmer(name: string): Promise<Farmer> {
  try {
    const { supabase } = await requireAuth();
    const trimmed = farmerNameSchema.parse(name);

    const { data, error } = await supabase
      .from('farmers')
      .insert({ name: trimmed })
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Tên AE này đã tồn tại');
      throw error;
    }

    revalidatePath('/farmers');
    return data as Farmer;
  } catch (error) {
    handleActionError(error);
  }
}

export async function updateFarmer(id: string, name: string): Promise<Farmer> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);
    const trimmed = farmerNameSchema.parse(name);

    const { data: oldFarmer } = await supabase
      .from('farmers')
      .select('name')
      .eq('id', validatedId)
      .single();

    const { data, error } = await supabase
      .from('farmers')
      .update({ name: trimmed })
      .eq('id', validatedId)
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Tên AE này đã tồn tại');
      throw error;
    }

    if (oldFarmer && oldFarmer.name !== trimmed) {
      await supabase
        .from('accounts')
        .update({ current_holder: trimmed })
        .ilike('current_holder', oldFarmer.name);

      await supabase
        .from('accounts')
        .update({ added_by: trimmed })
        .ilike('added_by', oldFarmer.name);

      await supabase
        .from('holder_sessions')
        .update({ holder_name: trimmed })
        .ilike('holder_name', oldFarmer.name);
    }

    revalidatePath('/farmers');
    return data as Farmer;
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteFarmer(id: string): Promise<void> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);

    const { error } = await supabase
      .from('farmers')
      .delete()
      .eq('id', validatedId);

    if (error) throw error;

    revalidatePath('/farmers');
  } catch (error) {
    handleActionError(error);
  }
}
