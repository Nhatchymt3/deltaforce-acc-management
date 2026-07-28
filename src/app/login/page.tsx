import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  async function signIn(formData: FormData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const email = process.env.SHARED_AUTH_EMAIL;
    if (!email) throw new Error('SHARED_AUTH_EMAIL is not configured');
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Đăng nhập thất bại');
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form action={signIn} className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">DeltaForce</p><h1 className="mt-3 text-3xl font-bold">Acc Management</h1><p className="mt-2 text-sm text-slate-400">Đăng nhập bằng mật khẩu dùng chung.</p></div>
        <label className="block text-sm font-medium">Mật khẩu<input name="password" type="password" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" /></label>
        <button className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400" type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
