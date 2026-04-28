import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { extractError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a number'),
});
type FormValues = z.infer<typeof schema>;

export function SignupPage(): JSX.Element {
  const { signup, user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signup(values);
      toast.success('Account created — welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      const e = extractError(err);
      if (e.fieldErrors) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          setError(field as keyof FormValues, { message: msgs.join(', ') });
        }
      }
      toast.error('Could not create account', e.message);
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

        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-slate-600 mb-6">Start reading, practicing, and ranking up.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            autoComplete="name"
            placeholder="Jane Learner"
            trailing={<UserIcon className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
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
            autoComplete="new-password"
            placeholder="••••••••"
            trailing={<Lock className="w-4 h-4" />}
            hint="At least 8 characters with upper, lower, and a number."
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="primary" loading={submitting} fullWidth size="lg">
            Create account
          </Button>
        </form>

        <p className="text-sm text-slate-600 mt-5 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
