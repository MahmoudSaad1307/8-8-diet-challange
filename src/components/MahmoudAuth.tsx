import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface MahmoudAuthProps {
  onSuccess: () => void;
}

export function MahmoudAuth({ onSuccess }: MahmoudAuthProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read password from env or default to 'mahmoud88'
  const expectedPassword = (import.meta.env.VITE_APP_PASSWORD || 'mahmoud88').trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);

    // Simulate small delay for premium feedback
    setTimeout(() => {
      if (password.trim() === expectedPassword) {
        localStorage.setItem('mahmoud_authorized', 'true');
        onSuccess();
      } else {
        setError(true);
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 relative overflow-hidden bg-ink-950">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className={`card p-6 sm:p-8 text-center transition-all duration-300 ${error ? 'border-rose-500/30 shadow-neon-rose animate-shake' : 'hover:border-emerald-500/15'}`}>
          {/* Header Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-400/20">
            {error ? (
              <Lock className="h-8 w-8 text-rose-400" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            )}
          </div>

          {/* Titles */}
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2 font-display">
            Are You Mahmoud?
          </h1>
          <h2 className="text-xl font-extrabold tracking-tight text-emerald-400 mb-2">
            هل أنت محمود؟
          </h2>
          <p className="text-xs font-semibold text-slate-400 mb-8">
            تحدي التنشيف 8-8 · أدخل كلمة المرور للمتابعة
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                disabled={isSubmitting}
                placeholder="كلمة المرور / Password"
                className={`input text-center font-semibold text-base pr-12 pl-12 ${error ? 'border-rose-500/50 focus:border-rose-500/80 focus:shadow-none' : ''}`}
                dir="ltr"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-xs font-bold text-rose-400 animate-fade-in">
                كلمة المرور غير صحيحة. حاول مرة أخرى.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="btn-primary w-full mt-2 py-3 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-950 border-t-transparent"></div>
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <span>دخول / Enter</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
