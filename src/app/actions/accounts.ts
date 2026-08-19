'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, handleActionError } from '@/lib/auth-guard';
import type { Account, HolderSession, Milestone } from '@/lib/types';
import { z } from 'zod';

type Action = 'update_level' | 'done' | 'deliver' | 'pay';

const uuidSchema = z.string().uuid('ID không hợp lệ');

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

async function fetchCurrentVersion(accountId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('accounts')
    .select('version')
    .eq('id', accountId)
    .single();
  if (error) throw error;
  return (data as { version: number }).version;
}

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
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase.rpc('move_account', {
      p_account_id: validatedId,
      p_next_holder: nextHolder,
      p_target_pos: position,
      p_known_version: knownVersion,
    });

    if (error) {
      if (isVersionConflict(error.message)) {
        throw new Error('Tài khoản đã được người khác thao tác trước đó!');
      }
      throw error;
    }

    const account = serializeAccount(data);
    revalidatePath('/');
    return account;
  } catch (error) {
    handleActionError(error);
  }
}

export async function getAccountSessions(accountId: string): Promise<HolderSession[]> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase
      .from('holder_sessions')
      .select('*')
      .eq('account_id', validatedId)
      .order('started_at');

    if (error) throw error;
    return (data ?? []).map((s) => ({
      ...s,
      duration_seconds: s.duration_seconds != null ? Number(s.duration_seconds) : null,
    })) as HolderSession[];
  } catch (error) {
    handleActionError(error);
  }
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
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(input.accountId);

    const { data, error } = await supabase.rpc('transition_account', {
      p_account_id: validatedId,
      p_action: input.action,
      p_known_version: input.knownVersion,
      p_current_level: input.currentLevel ?? null,
      p_target_milestone_id: input.targetMilestoneId ?? null,
      p_amount_received: input.amountReceived ? Number(input.amountReceived) : null,
      p_note: input.note ?? null,
    });
    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function createAccountWithMilestones(input: {
  source: string;
  username: string;
  password?: string;
  milestones: Array<{ level: number; price: string; note?: string }>;
  initialHolder?: string;
  addedBy?: string;
}) {
  try {
    const { supabase } = await requireAuth();
    const sourceId = uuidSchema.parse(input.source);
    const username = z.string().trim().min(1, 'Tên acc không được để trống').parse(input.username);

    const milestonesJsonb = input.milestones.map((m) => ({
      level: m.level,
      price: m.price,
      note: m.note ?? null,
    }));

    const { data, error } = await supabase.rpc('create_account_with_milestones', {
      p_source: sourceId,
      p_username: username,
      p_password: input.password ?? '',
      p_milestones: milestonesJsonb,
      p_initial_holder: input.initialHolder ?? null,
      p_added_by: input.addedBy ?? null,
    });
    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadAccountImage(
  accountId: string,
  knownVersion: number,
  formData: FormData
) {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('Chưa chọn file');

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('File quá lớn – tối đa 5 MB');
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Định dạng file không hợp lệ');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${validatedId}/${Date.now()}.${ext}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from('account-results')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.rpc('upload_account_image', {
      p_account_id: validatedId,
      p_path: path,
      p_known_version: knownVersion,
    });
    if (error) {
      await admin.storage.from('account-results').remove([path]);
      throw error;
    }
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function uploadAccountImages(
  accountId: string,
  knownVersion: number,
  formData: FormData
): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const files = formData.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) throw new Error('Chưa chọn file');

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(`"${file.name}" quá lớn – tối đa 5 MB`);
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`"${file.name}" không phải ảnh hợp lệ`);
      }
    }

    const admin = createAdminClient();
    const timestamp = Date.now();

    const fileDataList = await Promise.all(
      files.map(async (file, idx) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${validatedId}/${timestamp}-${idx}.${ext}`;
        return { file, buffer, path };
      })
    );

    const uploadResults = await Promise.all(
      fileDataList.map(({ file, buffer, path }) =>
        admin.storage.from('account-results').upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        }).then((res) => ({ ...res, path }))
      )
    );

    const uploadedPaths: string[] = [];
    for (const res of uploadResults) {
      if (res.error) {
        if (uploadedPaths.length > 0) {
          await admin.storage.from('account-results').remove(uploadedPaths);
        }
        throw res.error;
      }
      uploadedPaths.push(res.path);
    }

    const latestPath = uploadedPaths[uploadedPaths.length - 1];

    try {
      const account = await runVersionTolerantRpc(validatedId, knownVersion, async (version) =>
        supabase.rpc('upload_account_image', {
          p_account_id: validatedId,
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
  } catch (error) {
    handleActionError(error);
  }
}

export async function listAccountImages(
  accountId: string
): Promise<Array<{ path: string; url: string }>> {
  try {
    await requireAuth();
    const validatedId = uuidSchema.parse(accountId);
    const admin = createAdminClient();

    const { data: files, error } = await admin.storage
      .from('account-results')
      .list(validatedId, { sortBy: { column: 'name', order: 'desc' } });
    if (error) throw error;

    const paths = (files ?? [])
      .filter((f) => f.name && !f.name.startsWith('.'))
      .map((f) => `${validatedId}/${f.name}`);
    if (paths.length === 0) return [];

    const { data: signed, error: signErr } = await admin.storage
      .from('account-results')
      .createSignedUrls(paths, 300);
    if (signErr) throw signErr;

    return (signed ?? [])
      .filter((s) => s.signedUrl && s.path)
      .map((s) => ({ path: s.path as string, url: s.signedUrl }));
  } catch (error) {
    handleActionError(error);
  }
}

export async function removeAccountImage(
  accountId: string,
  knownVersion: number,
  path: string
): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    if (!path.startsWith(`${validatedId}/`)) {
      throw new Error('Đường dẫn ảnh không hợp lệ');
    }

    const admin = createAdminClient();
    const { error: removeError } = await admin.storage
      .from('account-results')
      .remove([path]);
    if (removeError) throw removeError;

    const { data: files } = await admin.storage
      .from('account-results')
      .list(validatedId, { sortBy: { column: 'name', order: 'desc' } });
    const remaining = (files ?? [])
      .filter((f) => f.name && !f.name.startsWith('.'))
      .map((f) => `${validatedId}/${f.name}`);

    const nextPath = remaining[0];
    if (!nextPath) {
      const account = await runVersionTolerantRpc(validatedId, knownVersion, async (version) =>
        supabase.rpc('clear_account_image', {
          p_account_id: validatedId,
          p_known_version: version,
        })
      );
      revalidatePath('/');
      return account;
    }

    const account = await runVersionTolerantRpc(validatedId, knownVersion, async (version) =>
      supabase.rpc('upload_account_image', {
        p_account_id: validatedId,
        p_path: nextPath,
        p_known_version: version,
      })
    );
    revalidatePath('/');
    return account;
  } catch (error) {
    handleActionError(error);
  }
}

export async function clearAccountImage(accountId: string, knownVersion: number) {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);
    const admin = createAdminClient();

    try {
      const { data: files } = await admin.storage
        .from('account-results')
        .list(validatedId);
      if (files && files.length > 0) {
        await admin.storage
          .from('account-results')
          .remove(files.map((f) => `${validatedId}/${f.name}`));
      }
    } catch (err) {
      console.warn('[Storage Cleanup Warning]:', err);
    }

    const account = await runVersionTolerantRpc(validatedId, knownVersion, async (version) =>
      supabase.rpc('clear_account_image', {
        p_account_id: validatedId,
        p_known_version: version,
      })
    );
    revalidatePath('/');
    return account;
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteAccount(accountId: string) {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    try {
      const admin = createAdminClient();
      const { data: files } = await admin.storage
        .from('account-results')
        .list(validatedId);
      if (files && files.length > 0) {
        await admin.storage
          .from('account-results')
          .remove(files.map((f) => `${validatedId}/${f.name}`));
      }
    } catch (err) {
      console.warn('[Storage Delete Warning]:', err);
    }

    const { error } = await supabase.from('accounts').delete().eq('id', validatedId);
    if (error) throw error;
    revalidatePath('/');
  } catch (error) {
    handleActionError(error);
  }
}

export async function getSignedImageUrl(path: string): Promise<string> {
  try {
    await requireAuth();
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from('account-results')
      .createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    handleActionError(error);
  }
}

export async function ensureMilestone(accountId: string, level: number, price: string): Promise<string> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data: existing, error: checkErr } = await supabase
      .from('account_milestones')
      .select('id, level, price')
      .eq('account_id', validatedId);

    if (checkErr) throw checkErr;

    if (existing && existing.length > 0) {
      const exactMatch = existing.find((m) => m.level === level && String(m.price) === String(price));
      if (exactMatch) return exactMatch.id;

      const targetId = existing[0]!.id;
      const { error: updateErr } = await supabase
        .from('account_milestones')
        .update({ level, price })
        .eq('id', targetId);

      if (updateErr) throw updateErr;
      return targetId;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('account_milestones')
      .insert({ account_id: validatedId, level, price })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    return inserted.id;
  } catch (error) {
    handleActionError(error);
  }
}

export async function updateMilestone(id: string, level: number, price: string, note?: string | null): Promise<Milestone> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);

    const { data, error } = await supabase
      .from('account_milestones')
      .update({ level, price, note: note ?? null })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return { ...data, price: String(data.price) } as Milestone;
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteMilestone(id: string): Promise<void> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(id);

    const { error } = await supabase
      .from('account_milestones')
      .delete()
      .eq('id', validatedId);

    if (error) throw error;
    revalidatePath('/');
  } catch (error) {
    handleActionError(error);
  }
}

export async function getAccountMilestones(accountId: string): Promise<Milestone[]> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase
      .from('account_milestones')
      .select('*')
      .eq('account_id', validatedId)
      .order('level', { ascending: true });
    if (error) return [];
    return (data ?? []).map((m) => ({ ...m, price: String(m.price) })) as Milestone[];
  } catch (error) {
    handleActionError(error);
  }
}

export async function updateGameUuid(accountId: string, gameUuid: string): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);
    const trimmed = gameUuid.trim();

    const { data, error } = await supabase
      .from('accounts')
      .update({ game_uuid: trimmed || null })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function revertToDangCay(accountId: string): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase
      .from('accounts')
      .update({
        status: 'dang_cay',
        completed_at: null,
      })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function revertToDelivered(accountId: string): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase
      .from('accounts')
      .update({
        status: 'da_giao_cho_ben_thu',
        paid_at: null,
        amount_received: null,
      })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function revertToDone(accountId: string): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);

    const { data, error } = await supabase
      .from('accounts')
      .update({
        status: 'done',
        delivered_at: null,
      })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}

export async function setAccountTag(
  accountId: string,
  tagLabel: string | null,
  days: number | null
): Promise<Account> {
  try {
    const { supabase } = await requireAuth();
    const validatedId = uuidSchema.parse(accountId);
    let tagExpiresAt: string | null = null;

    if (tagLabel && days && days > 0) {
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      tagExpiresAt = expires.toISOString();
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({
        tag_label: tagLabel,
        tag_expires_at: tagExpiresAt,
      })
      .eq('id', validatedId)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    return serializeAccount(data);
  } catch (error) {
    handleActionError(error);
  }
}
