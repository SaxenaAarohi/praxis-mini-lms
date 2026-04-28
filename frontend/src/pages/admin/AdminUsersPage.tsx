import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { fromNow } from '@/lib/format';

export function AdminUsersPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.dashboard.admin(),
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data) return <p className="text-sm text-red-600">Could not load users.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Latest learners</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.recentUsers.map((u) => (
              <tr key={u.id} className="border-b last:border-b-0 border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.role === 'ADMIN' ? 'amber' : 'slate'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fromNow(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
