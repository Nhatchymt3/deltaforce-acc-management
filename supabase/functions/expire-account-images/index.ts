import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (request) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = request.headers.get('authorization');
  if (cronSecret !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Fetch rows whose images have expired ───────────────────────────────────
  const { data: rows, error: fetchError } = await supabase
    .from('accounts')
    .select('id, image_url, version')
    .not('image_url', 'is', null)
    .lte('image_expires_at', new Date().toISOString())
    .limit(200);

  if (fetchError) {
    console.error('[expire-account-images] fetch error:', fetchError);
    return Response.json({ error: fetchError.message, processed: 0 }, { status: 500 });
  }

  let processed = 0;
  const skipped: string[] = [];

  for (const row of rows ?? []) {
    if (!row.image_url) continue;

    // 1. Remove every stored object for this account (multiple result images
    //    can be uploaded per account, all living under `${accountId}/`).
    const accountId = String(row.image_url).split('/')[0] || row.id;
    const { data: files, error: listError } = await supabase.storage
      .from('account-results')
      .list(accountId);

    if (listError) {
      console.warn(`[expire-account-images] storage.list failed for "${accountId}":`, listError.message);
      skipped.push(row.image_url);
      continue;
    }

    const paths = (files ?? [])
      .filter((f: { name?: string }) => f.name && !f.name.startsWith('.'))
      .map((f: { name: string }) => `${accountId}/${f.name}`);

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from('account-results')
        .remove(paths);

      if (removeError) {
        console.warn(`[expire-account-images] storage.remove failed for "${accountId}":`, removeError.message);
        skipped.push(row.image_url);
        continue; // skip this row – do NOT call clear_account_image
      }
    }

    // 2. Clear the DB column via RPC (idempotent; retries once on version_conflict)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'clear_account_image',
      { p_account_id: row.id, p_known_version: row.version }
    );

    if (rpcError) {
      // version_conflict → refetch current version and retry once
      if (rpcError.message?.includes('version_conflict') || rpcError.code === 'P0001') {
        const { data: fresh } = await supabase
          .from('accounts')
          .select('id, version')
          .eq('id', row.id)
          .single();

        if (fresh) {
          const retry = await supabase.rpc('clear_account_image', {
            p_account_id: row.id,
            p_known_version: fresh.version,
          });
          if (retry.error) {
            console.error(`[expire-account-images] retry failed for ${row.id}:`, retry.error.message);
            skipped.push(row.image_url);
            continue;
          }
        }
      } else {
        console.error(`[expire-account-images] RPC error for ${row.id}:`, rpcError.message);
        skipped.push(row.image_url);
        continue;
      }
    }

    processed++;
  }

  console.log(`[expire-account-images] processed=${processed} skipped=${skipped.length} skipped_paths=${JSON.stringify(skipped)}`);

  // NOTE: This function intentionally does NOT delete any rows from
  //       accounts, account_milestones, or holder_sessions.
  return Response.json({
    processed,
    skipped: skipped.length,
    skipped_paths: skipped,
  });
});
