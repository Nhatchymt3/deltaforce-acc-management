import { createClient } from '@/lib/supabase/server';

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  }

  return { user, supabase };
}

export function handleActionError(error: unknown): never {
  if (error instanceof Error) {
    // If it's already a clean thrown user message, rethrow
    if (!error.message.includes('Database error') && !error.message.includes('postgres')) {
      throw error;
    }
  }
  console.error('[Server Action Error]:', error);
  throw new Error('Thao tác thất bại. Vui lòng thử lại sau.');
}
