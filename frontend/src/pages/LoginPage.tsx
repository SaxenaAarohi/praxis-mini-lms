import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { extractError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage(): JSX.Element {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const from = (location.state as LocationState | null)?.from?.pathname || '/';

  if (!loading && user) return <Navigate to={from} replace />;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const e = extractError(err);
      toast.error('Login failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-brand-50 via-white to-slate-50">
      <div className="card w-full max-w-md p-7 shadow-xl border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="font-semibold text-lg">Mini LMS</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-slate-600 mb-6">
          Sign in to continue your learning journey.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            trailing={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            trailing={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="primary" loading={submitting} fullWidth size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-sm text-slate-600 mt-5 text-center">
          New here?{' '}
          <Link to="/signup" className="text-brand-700 font-medium hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1">Demo accounts (after running seed):</p>
          <p>
            Admin: <span className="font-mono">admin@lms.dev</span> / <span className="font-mono">Admin@123</span>
          </p>
          <p>
            User: <span className="font-mono">student@lms.dev</span> / <span className="font-mono">Student@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
