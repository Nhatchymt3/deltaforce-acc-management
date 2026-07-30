'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Farmer } from '@/lib/types';

export async function getFarmers(): Promise<Farmer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('farmers')
    .select('id, name')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Farmer[];
}

export async function createFarmer(name: string): Promise<Farmer> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên AE không được để trống');

  const { data, error } = await supabase
    .from('farmers')
    .insert({ name: trimmed })
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Tên AE này đã tồn tại');
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/farmers');
  return data as Farmer;
}

export async function updateFarmer(id: string, name: string): Promise<Farmer> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên AE không được để trống');

  const { data: oldFarmer } = await supabase
    .from('farmers')
    .select('name')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('farmers')
    .update({ name: trimmed })
    .eq('id', id)
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Tên AE này đã tồn tại');
    throw new Error(error.message);
  }

  if (oldFarmer && oldFarmer.name !== trimmed) {
    await supabase
      .from('accounts')
      .update({ current_holder: trimmed })
      .ilike('current_holder', oldFarmer.name);

    await supabase
      .from('holder_sessions')
      .update({ holder_name: trimmed })
      .ilike('holder_name', oldFarmer.name);
  }

  revalidatePath('/');
  revalidatePath('/farmers');
  return data as Farmer;
}

export async function deleteFarmer(id: string): Promise<void> {
  const supabase = await createClient();

  // Optionally check if any accounts are held by this farmer (using name matching)
  // But current_holder is text, so we can just delete from the farmers list.

  const { error } = await supabase
    .from('farmers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/farmers');
}
