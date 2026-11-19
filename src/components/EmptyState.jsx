import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, children, className }) {
  return (
    <div className={cn('text-center py-14 px-4', className)}>
      {Icon && <Icon className="w-9 h-9 mx-auto mb-3 text-stone-300" strokeWidth={1.5} />}
      <p className="text-sm text-stone-400">{children}</p>
    </div>
  );
}