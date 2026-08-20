import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;

  async function signIn(formData: FormData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const email = process.env.SHARED_AUTH_EMAIL;
    if (!email) {
      redirect('/login?error=config');
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email!, password });
    if (error) {
      redirect('/login?error=invalid');
    }
    redirect('/');
  }

  const errorMessage =
    errorParam === 'config'
      ? 'Hệ thống chưa cấu hình đăng nhập. Liên hệ quản trị viên.'
      : errorParam === 'invalid'
      ? 'Mật khẩu không đúng. Vui lòng thử lại.'
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <form action={signIn} className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-7">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-wide">DF<span className="text-primary">△</span></h1>
          <p className="mt-1 text-xs text-muted-foreground">Đăng nhập bằng mật khẩu dùng chung.</p>
        </div>
        {errorMessage && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
        <label className="block text-xs font-medium text-muted-foreground">
          Mật khẩu
          <input name="password" type="password" required className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all" />
        </label>
        <button className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90" type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
