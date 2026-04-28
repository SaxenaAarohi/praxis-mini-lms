import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mb-3">
          <Compass className="w-6 h-6 text-brand-700" />
        </div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-slate-600 mt-2">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn-primary mt-5 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
