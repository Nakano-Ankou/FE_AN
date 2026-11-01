import type { ReactNode } from 'react';
import { PageContainer, PageHeader } from '../../components/layout';
import { Alert } from '../../components/ui/feedback/Alert';
import { EmptyState } from '../../components/ui/feedback/EmptyState';
import { Spinner } from '../../components/ui/feedback/Spinner';
import { Button } from '../../components/ui/form/Button';

export function AdminPageFrame({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer maxWidth="xl">
      <PageHeader title={title} subtitle={subtitle} action={action} animated={false} />
      {children}
    </PageContainer>
  );
}

export function AdminRequestState({
  loading,
  error,
  onRetry,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spinner size="lg" label="Đang tải dữ liệu quản trị..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="danger"
        role="alert"
        action={
          <Button variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (empty) {
    return (
      <EmptyState
        title="Chưa có dữ liệu"
        description="Hiện chưa có bản ghi nào phù hợp."
        icon="📋"
      />
    );
  }

  return <>{children}</>;
}

export function AdminSearchInput({
  value,
  onChange,
  label = 'Tìm kiếm',
  placeholder = 'Nhập từ khóa...',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="block w-full max-w-md space-y-1.5">
      <span className="text-body-sm font-semibold text-foreground">{label}</span>
      <input
        className="focus-ring h-11 w-full rounded-control border border-input bg-card px-4 text-body text-foreground placeholder:text-muted-foreground"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-border bg-card md:block">
      <table className="w-full border-collapse text-left text-body-sm">
        {children}
      </table>
    </div>
  );
}

export function AdminTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted text-caption font-bold uppercase text-muted-foreground">
      <tr>{children}</tr>
    </thead>
  );
}

export function AdminTableCell({ children }: { children: ReactNode }) {
  return <td className="border-t border-border px-4 py-3 align-middle">{children}</td>;
}

export function AdminTableHeading({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-caption font-bold text-muted-foreground">
      {children}
    </th>
  );
}

export function AdminMobileList({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:hidden">{children}</div>;
}
