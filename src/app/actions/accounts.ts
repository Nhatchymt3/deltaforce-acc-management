'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Account, HolderSession } from '@/lib/types';

type Action = 'update_level' | 'done' | 'deliver' | 'pay';

// The RPCs return the raw `accounts` row where bigint columns arrive as
// BigInt values. Those cannot be JSON-serialised across the server/client
// boundary, so normalise them to the string shape the client `Account` uses.
function serializeAccount(row: unknown): Account {
  const a = row as Record<string, unknown>;
  return {
    ...a,
    amount_received: a.amount_received != null ? String(a.amount_received) : null,
  } as Account;
}

export async function moveAccount(
  accountId: string,
  nextHolder: string | null,
  position: number,
  knownVersion: number
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('move_account', {
    p_account_id: accountId,
    p_next_holder: nextHolder,
    p_target_pos: position,
    p_known_version: knownVersion,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/finance');
  return serializeAccount(data);
}

// Fetch the current holder-session history for a single account. The board
// loads all sessions once on the initial render; after a move/done the rows
// change server-side, so the client refetches this to keep the "Lịch sử" tab
// (and running time per AE) in sync without a full page reload.
export async function getAccountSessions(accountId: string): Promise<HolderSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('holder_sessions')
    .select('*')
    .eq('account_id', accountId)
    .order('started_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    ...s,
    duration_seconds: s.duration_seconds != null ? Number(s.duration_seconds) : null,
  })) as HolderSession[];
}

export async function transitionAccount(input: {
  accountId: string;
  action: Action;
  knownVersion: number;
  currentLevel?: number;
  targetMilestoneId?: string;
  amountReceived?: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('transition_account', {
    p_account_id: input.accountId,
    p_action: input.action,
    p_known_version: input.knownVersion,
    p_current_level: input.currentLevel ?? null,
    p_target_milestone_id: input.targetMilestoneId ?? null,
    p_amount_received: input.amountReceived ? BigInt(input.amountReceived) : null,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/finance');
  return serializeAccount(data);
}

export async function createAccountWithMilestones(input: {
  source: string; // uuid
  username: string;
  password?: string;
  milestones: Array<{ level: number; price: string; note?: string }>;
  initialHolder?: string;
}) {
  const supabase = await createClient();
  const milestonesJsonb = input.milestones.map((m) => ({
    level: m.level,
    price: m.price, // text now
    note: m.note ?? null,
  }));
  const { data, error } = await supabase.rpc('create_account_with_milestones', {
    p_source: input.source,
    p_username: input.username,
    p_password: input.password ?? '',
    p_milestones: milestonesJsonb,
    p_initial_holder: input.initialHolder ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return serializeAccount(data);
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadAccountImage(
  accountId: string,
  knownVersion: number,
  formData: FormData
) {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('File too large – maximum size is 5 MB');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type – only images are allowed');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${accountId}/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('account-results')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('upload_account_image', {
    p_account_id: accountId,
    p_path: path,
    p_known_version: knownVersion,
  });
  if (error) {
    // best-effort cleanup of uploaded file on RPC failure
    await admin.storage.from('account-results').remove([path]);
    throw new Error(error.message);
  }
  revalidatePath('/');
  return serializeAccount(data);
}

export async function clearAccountImage(accountId: string, knownVersion: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('clear_account_image', {
    p_account_id: accountId,
    p_known_version: knownVersion,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return serializeAccount(data);
}

export async function getSignedImageUrl(path: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('account-results')
    .createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
