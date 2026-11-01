import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Tags, UsersRound } from 'lucide-react';
import { PageSection } from '../../components/layout';
import { Alert } from '../../components/ui/feedback/Alert';
import { EmptyState } from '../../components/ui/feedback/EmptyState';
import { StatCard } from '../../components/ui/display/StatCard';
import { Spinner } from '../../components/ui/feedback/Spinner';
import type { PlaceResponse, TagResponse, UserResponse } from '../../types';
import { normalizeApiError } from '../../services/apiClient';
import {
  getAdminPlaces,
  getAdminTags,
  getAdminUsers,
} from '../../services/adminService';
import { AdminPageFrame } from './AdminShared';

interface DashboardCounts {
  users: number | null;
  places: number | null;
  tags: number | null;
  errors: string[];
}

const initialCounts: DashboardCounts = {
  users: null,
  places: null,
  tags: null,
  errors: [],
};

export default function AdminOverviewStats() {
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    const [usersResult, placesResult, tagsResult] = await Promise.allSettled([
      getAdminUsers(),
      getAdminPlaces(),
      getAdminTags(),
    ]);

    const errors: string[] = [];
    const users =
      usersResult.status === 'fulfilled'
        ? (usersResult.value as UserResponse[]).length
        : (errors.push(`Người dùng: ${normalizeApiError(usersResult.reason).message}`), null);
    const places =
      placesResult.status === 'fulfilled'
        ? (placesResult.value as PlaceResponse[]).length
        : (errors.push(`Địa điểm: ${normalizeApiError(placesResult.reason).message}`), null);
    const tags =
      tagsResult.status === 'fulfilled'
        ? (tagsResult.value as TagResponse[]).length
        : (errors.push(`Tags: ${normalizeApiError(tagsResult.reason).message}`), null);

    setCounts({ users, places, tags, errors });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  return (
    <AdminPageFrame
      title="Tổng quan quản trị"
      subtitle="Tổng hợp dữ liệu hiện có từ các API quản trị."
    >
      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner size="lg" label="Đang tải dữ liệu tổng quan..." />
        </div>
      ) : (
        <>
          {counts.errors.length > 0 && (
            <Alert
              variant="warning"
              role="alert"
              action={
                <button
                  type="button"
                  className="focus-ring rounded-control px-3 py-2 font-semibold"
                  onClick={() => void loadCounts()}
                >
                  Tải lại
                </button>
              }
            >
              Một số dữ liệu chưa tải được. Các số liệu bên dưới chỉ lấy từ API thành công.
              <ul className="mt-2 list-inside list-disc">
                {counts.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
          {counts.users === null && counts.places === null && counts.tags === null ? (
            <EmptyState
              title="Chưa tải được dữ liệu"
              description="Không thể lấy dữ liệu tổng quan từ các API quản trị."
              icon="⚠️"
              action={
                <button
                  type="button"
                  className="focus-ring rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground"
                  onClick={() => void loadCounts()}
                >
                  Thử lại
                </button>
              }
            />
          ) : (
            <PageSection
              title="Dữ liệu hệ thống"
              subtitle="Số lượng được tính từ danh sách trả về bởi Backend."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  className="focus-ring block rounded-panel"
                  to="/admin/users"
                  aria-label="Mở quản lý người dùng"
                >
                  <StatCard
                    title="Người dùng"
                    value={counts.users ?? '—'}
                    description={counts.users === null ? 'Dữ liệu chưa khả dụng' : 'Tài khoản trong hệ thống'}
                    icon={<UsersRound size={20} />}
                  />
                </Link>
                <Link
                  className="focus-ring block rounded-panel"
                  to="/admin/places"
                  aria-label="Mở quản lý địa điểm"
                >
                  <StatCard
                    title="Địa điểm"
                    value={counts.places ?? '—'}
                    description={counts.places === null ? 'Dữ liệu chưa khả dụng' : 'Địa điểm ăn uống'}
                    icon={<MapPin size={20} />}
                  />
                </Link>
                <Link
                  className="focus-ring block rounded-panel"
                  to="/admin/tags"
                  aria-label="Mở quản lý Tags"
                >
                  <StatCard
                    title="Tags hệ thống"
                    value={counts.tags ?? '—'}
                    description={counts.tags === null ? 'Dữ liệu chưa khả dụng' : 'Tags sở thích'}
                    icon={<Tags size={20} />}
                  />
                </Link>
              </div>
            </PageSection>
          )}
        </>
      )}
    </AdminPageFrame>
  );
}
