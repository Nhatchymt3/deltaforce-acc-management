'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const admin = createAdminClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên AE không được để trống');

  const { data, error } = await admin
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
  const admin = createAdminClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tên AE không được để trống');

  const { data: oldFarmer } = await admin
    .from('farmers')
    .select('name')
    .eq('id', id)
    .single();

  const { data, error } = await admin
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
    // Update all accounts where current_holder matches old name (or matches any non-empty holder if only 1 farmer)
    await admin
      .from('accounts')
      .update({ current_holder: trimmed })
      .ilike('current_holder', oldFarmer.name);

    await admin
      .from('accounts')
      .update({ added_by: trimmed })
      .ilike('added_by', oldFarmer.name);

    await admin
      .from('holder_sessions')
      .update({ holder_name: trimmed })
      .ilike('holder_name', oldFarmer.name);
  }

  revalidatePath('/');
  revalidatePath('/farmers');
  return data as Farmer;
}

export async function deleteFarmer(id: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('farmers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/farmers');
}
