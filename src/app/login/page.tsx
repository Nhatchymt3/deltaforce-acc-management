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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form action={signIn} className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">DeltaForce</p><h1 className="mt-3 text-3xl font-bold">Acc Management</h1><p className="mt-2 text-sm text-slate-400">Đăng nhập bằng mật khẩu dùng chung.</p></div>
        {errorMessage && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
        <label className="block text-sm font-medium">Mật khẩu<input name="password" type="password" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" /></label>
        <button className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400" type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
