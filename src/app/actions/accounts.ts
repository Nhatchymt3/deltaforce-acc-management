'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Account, HolderSession, Milestone } from '@/lib/types';

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

function isVersionConflict(message: string | undefined): boolean {
  return !!message && message.toLowerCase().includes('version_conflict');
}

// Fetch the account's current version straight from the DB. Used to recover
// from a stale client `version` on image operations (which are not part of the
// status state-machine, so optimistic-concurrency failures there are pure
// friction rather than a real conflict to surface to the user).
async function fetchCurrentVersion(accountId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('accounts')
    .select('version')
    .eq('id', accountId)
    .single();
  if (error) throw new Error(error.message);
  return (data as { version: number }).version;
}

// Run a versioned RPC that takes a `p_known_version`, retrying once with the
// DB's current version if the first attempt hits a version_conflict. Used for
// operations where a stale client version is pure friction rather than a real
// conflict to surface (image writes, and moving an acc between holders — none
// of which are part of the status state-machine that concurrency must guard).
async function runVersionTolerantRpc(
  accountId: string,
  knownVersion: number,
  run: (version: number) => Promise<{ data: unknown; error: { message: string } | null }>
): Promise<Account> {
  const first = await run(knownVersion);
  if (!first.error) return serializeAccount(first.data);
  if (!isVersionConflict(first.error.message)) throw new Error(first.error.message);

  const fresh = await fetchCurrentVersion(accountId);
  const second = await run(fresh);
  if (second.error) throw new Error(second.error.message);
  return serializeAccount(second.data);
}

export async function moveAccount(
  accountId: string,
  nextHolder: string | null,
  position: number,
  knownVersion: number
) {
  const supabase = await createClient();
  const account = await runVersionTolerantRpc(accountId, knownVersion, async (version) =>
    supabase.rpc('move_account', {
      p_account_id: accountId,
      p_next_holder: nextHolder,
      p_target_pos: position,
      p_known_version: version,
    })
  );
  revalidatePath('/');
  revalidatePath('/finance');
  return account;
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
    p_amount_received: input.amountReceived ? Number(input.amountReceived) : null,
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
  addedBy?: string;
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
    p_added_by: input.addedBy ?? null,
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

// Upload multiple result images for an account in one call. Files are stored
// under the per-account storage folder; `image_url` is set (via RPC) to the
// most-recent path so the expiry cron and any single-image consumers keep
// working. Returns the refreshed account (version bumped once).
export async function uploadAccountImages(
  accountId: string,
  knownVersion: number,
  formData: FormData
): Promise<Account> {
  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) throw new Error('No file provided');

  for (const file of files) {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`"${file.name}" quá lớn – tối đa 5 MB`);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`"${file.name}" không phải ảnh hợp lệ`);
    }
  }

  const admin = createAdminClient();
  const uploadedPaths: string[] = [];
  let latestPath = '';

  let i = 0;
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${accountId}/${Date.now()}-${i}.${ext}`;
    i++;
    const { error: uploadError } = await admin.storage
      .from('account-results')
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      // best-effort cleanup of anything already uploaded in this batch
      if (uploadedPaths.length > 0) {
        await admin.storage.from('account-results').remove(uploadedPaths);
      }
      throw new Error(uploadError.message);
    }
    uploadedPaths.push(path);
    latestPath = path;
  }

  // Point image_url at the latest upload (bumps version once) so the row still
  // signals "has image" to the expiry cron and legacy consumers. Tolerate a
  // stale client version: image uploads shouldn't fail on optimistic-concurrency.
  const supabase = await createClient();
  try {
    const account = await runVersionTolerantRpc(accountId, knownVersion, async (version) =>
      supabase.rpc('upload_account_image', {
        p_account_id: accountId,
        p_path: latestPath,
        p_known_version: version,
      })
    );
    revalidatePath('/');
    return account;
  } catch (err) {
    await admin.storage.from('account-results').remove(uploadedPaths);
    throw err;
  }
}

// List every stored result image for an account, newest first, with a short-
// lived signed URL for each. Paths are relative to the `account-results` bucket.
export async function listAccountImages(
  accountId: string
): Promise<Array<{ path: string; url: string }>> {
  const admin = createAdminClient();
  const { data: files, error } = await admin.storage
    .from('account-results')
    .list(accountId, { sortBy: { column: 'name', order: 'desc' } });
  if (error) throw new Error(error.message);

  const paths = (files ?? [])
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => `${accountId}/${f.name}`);
  if (paths.length === 0) return [];

  const { data: signed, error: signErr } = await admin.storage
    .from('account-results')
    .createSignedUrls(paths, 300);
  if (signErr) throw new Error(signErr.message);

  return (signed ?? [])
    .filter((s) => s.signedUrl && s.path)
    .map((s) => ({ path: s.path as string, url: s.signedUrl }));
}

// Remove one specific image from storage. Afterwards `image_url` is repointed
// to a remaining image, or cleared if none remain. Returns refreshed account.
export async function removeAccountImage(
  accountId: string,
  knownVersion: number,
  path: string
): Promise<Account> {
  if (!path.startsWith(`${accountId}/`)) {
    throw new Error('Đường dẫn ảnh không hợp lệ');
  }

  const admin = createAdminClient();
  const { error: removeError } = await admin.storage
    .from('account-results')
    .remove([path]);
  if (removeError) throw new Error(removeError.message);

  const { data: files } = await admin.storage
    .from('account-results')
    .list(accountId, { sortBy: { column: 'name', order: 'desc' } });
  const remaining = (files ?? [])
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => `${accountId}/${f.name}`);

  const supabase = await createClient();
  const nextPath = remaining[0];
  if (!nextPath) {
    const account = await runVersionTolerantRpc(accountId, knownVersion, async (version) =>
      supabase.rpc('clear_account_image', {
        p_account_id: accountId,
        p_known_version: version,
      })
    );
    revalidatePath('/');
    return account;
  }

  const account = await runVersionTolerantRpc(accountId, knownVersion, async (version) =>
    supabase.rpc('upload_account_image', {
      p_account_id: accountId,
      p_path: nextPath,
      p_known_version: version,
    })
  );
  revalidatePath('/');
  return account;
}

export async function clearAccountImage(accountId: string, knownVersion: number) {
  // Remove all stored images for the account, then clear the DB pointer.
  const admin = createAdminClient();
  try {
    const { data: files } = await admin.storage
      .from('account-results')
      .list(accountId);
    if (files && files.length > 0) {
      await admin.storage
        .from('account-results')
        .remove(files.map((f) => `${accountId}/${f.name}`));
    }
  } catch {
    // ignore storage cleanup errors; still clear the DB pointer below
  }

  const supabase = await createClient();
  const account = await runVersionTolerantRpc(accountId, knownVersion, async (version) =>
    supabase.rpc('clear_account_image', {
      p_account_id: accountId,
      p_known_version: version,
    })
  );
  revalidatePath('/');
  return account;
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();

  // Best-effort cleanup of any uploaded result images for this account.
  // Storage removal uses the admin client; failure here must not block the
  // row delete, so it is intentionally swallowed.
  try {
    const admin = createAdminClient();
    const { data: files } = await admin.storage
      .from('account-results')
      .list(accountId);
    if (files && files.length > 0) {
      await admin.storage
        .from('account-results')
        .remove(files.map((f) => `${accountId}/${f.name}`));
    }
  } catch {
    // ignore storage cleanup errors
  }

  // Milestones and holder_sessions are removed automatically via
  // ON DELETE CASCADE foreign keys.
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/finance');
}

export async function getSignedImageUrl(path: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('account-results')
    .createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function ensureMilestone(accountId: string, level: number, price: string): Promise<string> {
  const supabase = await createClient();
  const { data: existing, error: checkErr } = await supabase
    .from('account_milestones')
    .select('id')
    .eq('account_id', accountId)
    .eq('level', level)
    .eq('price', price)
    .maybeSingle();

  if (checkErr) throw new Error(checkErr.message);
  if (existing) return existing.id;

  const { data: inserted, error: insertErr } = await supabase
    .from('account_milestones')
    .insert({ account_id: accountId, level, price })
    .select('id')
    .single();

  if (insertErr) throw new Error(insertErr.message);
  return inserted.id;
}

export async function updateMilestone(id: string, level: number, price: string): Promise<Milestone> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('account_milestones')
    .update({ level, price })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { ...data, price: String(data.price) } as Milestone;
}

export async function deleteMilestone(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('account_milestones')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}
