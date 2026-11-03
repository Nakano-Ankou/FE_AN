import { useState } from 'react';
import { Button } from '../../components/ui/form/Button';
import { SearchInput } from '../../components/ui/form/SearchInput';
import { Slider } from '../../components/ui/form/Slider';
import { Tag } from '../../components/ui/form/Tag';
import type { PlaceFilterParams } from '../../types';
import { isValidCoordinates } from '../../utils/geoCalculator';

interface PlaceFilterBarProps {
  filters: PlaceFilterParams;
  categories: string[];
  onChange: (filters: PlaceFilterParams) => void;
}

export default function PlaceFilterBar({
  filters,
  categories,
  onChange,
}: PlaceFilterBarProps) {
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const hasLocation =
    filters.latitude !== undefined &&
    filters.longitude !== undefined &&
    isValidCoordinates({ latitude: filters.latitude, longitude: filters.longitude });
  const radius = filters.radius ?? 5;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt này không hỗ trợ lấy vị trí. Bạn vẫn có thể tìm theo tên hoặc danh mục.');
      return;
    }

    setLocationError(null);
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({
          category: filters.category,
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius: filters.radius ?? 5,
        });
        setRequestingLocation(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Bạn chưa cấp quyền vị trí. Hãy cho phép truy cập vị trí trong cài đặt trình duyệt rồi thử lại.'
            : 'Không thể lấy vị trí hiện tại. Vui lòng thử lại hoặc tìm theo tên, danh mục.',
        );
        setRequestingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  function toggleLocation() {
    if (hasLocation) {
      onChange({ name: filters.name, category: filters.category });
      setLocationError(null);
      return;
    }
    requestLocation();
  }

  return (
    <section className="grid gap-4 rounded-panel border border-border bg-card p-4 md:p-6" aria-label="Bộ lọc địa điểm">
      <div className="grid gap-4 md:grid-cols-2">
        <SearchInput
          label="Tìm theo tên"
          placeholder={hasLocation ? 'Tắt lọc vị trí để tìm theo tên' : 'Ví dụ: bún bò, cơm tấm'}
          value={filters.name ?? ''}
          disabled={hasLocation}
          onChange={(event) =>
            onChange({
              name: event.currentTarget.value,
              category: filters.category,
            })
          }
          onClear={() => onChange({ category: filters.category })}
        />
        <div className="flex flex-col justify-end gap-2">
          <Button
            variant={hasLocation ? 'outline' : 'secondary'}
            onClick={toggleLocation}
            loading={requestingLocation}
            loadingText="Đang lấy vị trí..."
          >
            {hasLocation ? 'Tắt lọc vị trí' : 'Tìm quanh vị trí của tôi'}
          </Button>
          {hasLocation && (
            <p className="text-caption text-muted-foreground">
              Tìm trong bán kính {radius} km. Tọa độ chỉ được dùng sau khi bạn cấp quyền.
            </p>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-body-sm font-semibold text-foreground">Danh mục</p>
          <div className="flex flex-wrap gap-2">
            <Tag
              label="Tất cả"
              selected={!filters.category}
              onClick={() =>
                onChange({
                  ...filters,
                  category: undefined,
                })
              }
            />
            {categories.map((category) => (
              <Tag
                key={category}
                label={category}
                selected={filters.category === category}
                onClick={() =>
                  onChange({
                    ...filters,
                    category: filters.category === category ? undefined : category,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {hasLocation && (
        <Slider
          label="Bán kính tìm kiếm"
          min={1}
          max={50}
          step={1}
          value={radius}
          formatValue={(value) => `${value} km`}
          onValueChange={(value) => onChange({ ...filters, radius: value })}
        />
      )}

      {locationError && (
        <p className="text-body-sm text-danger" role="alert">
          {locationError}
        </p>
      )}
    </section>
  );
}
