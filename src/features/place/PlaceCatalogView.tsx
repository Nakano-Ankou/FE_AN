import { useEffect, useMemo, useState } from 'react';
import { Grid } from '../../components/layout/Grid';
import { PlaceCard } from '../../components/ui/display/PlaceCard';
import { Alert } from '../../components/ui/feedback/Alert';
import { EmptyState } from '../../components/ui/feedback/EmptyState';
import { Spinner } from '../../components/ui/feedback/Spinner';
import { SegmentedControl } from '../../components/ui/form/SegmentedControl';
import { normalizeApiError } from '../../services/apiClient';
import { getPlaces } from '../../services/placeService';
import type { ApiError, PlaceFilterParams, PlaceResponse } from '../../types';
import { isValidCoordinates } from '../../utils/geoCalculator';
import { useDebounce } from '../../hooks/useDebounce';
import PlaceFilterBar from './PlaceFilterBar';
import SoloSwipeDeck from './SoloSwipeDeck';

interface PlaceCatalogViewProps {
  mode: 'list' | 'swipe';
  onModeChange: (mode: 'list' | 'swipe') => void;
}

function getQueryParams(filters: PlaceFilterParams, debouncedName: string): PlaceFilterParams {
  const hasCoordinates =
    filters.latitude !== undefined &&
    filters.longitude !== undefined &&
    isValidCoordinates({ latitude: filters.latitude, longitude: filters.longitude });
  if (hasCoordinates && Number.isFinite(filters.radius) && (filters.radius ?? 0) > 0) {
    return {
      latitude: filters.latitude,
      longitude: filters.longitude,
      radius: filters.radius,
      ...(filters.category ? { category: filters.category } : {}),
    };
  }

  const name = debouncedName.trim();
  if (name) return { name };
  if (filters.category) return { category: filters.category };
  return {};
}

export default function PlaceCatalogView({ mode, onModeChange }: PlaceCatalogViewProps) {
  const [filters, setFilters] = useState<PlaceFilterParams>({});
  const [places, setPlaces] = useState<PlaceResponse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const debouncedName = useDebounce(filters.name ?? '', 300);
  const params = useMemo(
    () =>
      getQueryParams(
        {
          category: filters.category,
          latitude: filters.latitude,
          longitude: filters.longitude,
          radius: filters.radius,
        },
        debouncedName,
      ),
    [
      filters.category,
      filters.latitude,
      filters.longitude,
      filters.radius,
      debouncedName,
    ],
  );

  useEffect(() => {
    let active = true;

    async function loadPlaces() {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);

      try {
        const response = await getPlaces(params);
        if (!active) return;
        setPlaces(response);
        setCategories((current) =>
          Array.from(
            new Set([
              ...current,
              ...response
                .map((place) => place.category)
                .filter((category): category is string => Boolean(category)),
            ]),
          ).sort((left, right) => left.localeCompare(right, 'vi')),
        );
      } catch (requestError: unknown) {
        if (active) setError(normalizeApiError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPlaces();

    return () => {
      active = false;
    };
  }, [params, retryKey]);

  const listIsEmpty = !loading && !error && places.length === 0;
  const isForbidden = error?.status === 403 || error?.code === 1003;

  return (
    <div className="grid gap-6">
      <PlaceFilterBar filters={filters} categories={categories} onChange={setFilters} />
      <div className="flex justify-start md:justify-end">
        <SegmentedControl
          aria-label="Chế độ khám phá địa điểm"
          value={mode}
          onValueChange={(value) => onModeChange(value === 'swipe' ? 'swipe' : 'list')}
          options={[
            { label: 'Danh sách', value: 'list' },
            { label: 'Quẹt thẻ', value: 'swipe' },
          ]}
        />
      </div>

      {error && (
        <Alert
          variant={isForbidden ? 'warning' : 'danger'}
          role="alert"
          title={isForbidden ? 'Chưa được cấp quyền xem địa điểm' : 'Không thể tải địa điểm'}
          action={
            <button
              type="button"
              className="focus-ring min-h-11 rounded-control border border-current px-4 py-2 font-semibold"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              Thử lại
            </button>
          }
        >
          {isForbidden
            ? 'Máy chủ từ chối quyền truy cập danh sách địa điểm cho tài khoản hiện tại. Đây là giới hạn phân quyền từ API; ứng dụng không thay thế bằng dữ liệu mẫu.'
            : error.message}
        </Alert>
      )}

      {loading && (
        <div className="flex min-h-48 items-center justify-center" aria-live="polite">
          <Spinner size="lg" label="Đang tải địa điểm..." />
        </div>
      )}

      {!loading && !error && mode === 'list' && listIsEmpty && (
        <EmptyState
          title="Chưa tìm thấy địa điểm"
          description="Hãy thử đổi từ khóa hoặc bộ lọc để tìm thêm địa điểm."
          icon="🍜"
        />
      )}

      {!loading && !error && mode === 'list' && places.length > 0 && (
        <Grid cols={1} mdCols={2} gap={5} aria-label="Danh sách địa điểm">
          {places.map((place) => <PlaceCard key={place.id} place={place} />)}
        </Grid>
      )}

      {!loading && !error && mode === 'swipe' && (
        <SoloSwipeDeck key={places.map((place) => place.id).join(':')} places={places} />
      )}
    </div>
  );
}
