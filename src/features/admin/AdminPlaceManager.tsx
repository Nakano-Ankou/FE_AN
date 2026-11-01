import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/feedback/Alert';
import { Card } from '../../components/ui/display/Card';
import { Modal } from '../../components/ui/feedback/Modal';
import { Button, Input } from '../../components/ui/form';
import type { PlaceCreationRequest, PlaceResponse } from '../../types';
import { normalizeApiError } from '../../services/apiClient';
import {
  createAdminPlace,
  deleteAdminPlace,
  getAdminPlaces,
  updateAdminPlace,
} from '../../services/adminService';
import {
  AdminMobileList,
  AdminPageFrame,
  AdminRequestState,
  AdminSearchInput,
  AdminTable,
  AdminTableCell,
  AdminTableHeader,
  AdminTableHeading,
} from './AdminShared';

const PLACE_FORM_ID = 'admin-place-form';

interface PlaceFormValues {
  name: string;
  category: string;
  address: string;
  imageUrl: string;
  priceRange: string;
  latitude: string;
  longitude: string;
}

const emptyValues: PlaceFormValues = {
  name: '',
  category: '',
  address: '',
  imageUrl: '',
  priceRange: '',
  latitude: '',
  longitude: '',
};

function toFormValues(place: PlaceResponse): PlaceFormValues {
  return {
    name: place.name,
    category: place.category ?? '',
    address: place.address ?? '',
    imageUrl: place.imageUrl ?? '',
    priceRange: place.priceRange == null ? '' : String(place.priceRange),
    latitude: String(place.latitude),
    longitude: String(place.longitude),
  };
}

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

export default function AdminPlaceManager() {
  const [places, setPlaces] = useState<PlaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlaceResponse | null>(null);
  const [values, setValues] = useState<PlaceFormValues>(emptyValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaceResponse | null>(null);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlaces(await getAdminPlaces());
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return places;
    return places.filter((place) =>
      [place.name, place.category ?? '', place.address ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [places, query]);

  function openCreate() {
    setFormOpen(true);
    setEditing(null);
    setValues(emptyValues);
    setFormError(null);
    setNotice(null);
  }

  function openEdit(place: PlaceResponse) {
    setFormOpen(true);
    setEditing(place);
    setValues(toFormValues(place));
    setFormError(null);
    setNotice(null);
  }

  function updateField(field: keyof PlaceFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = Number(values.latitude);
    const longitude = Number(values.longitude);
    const priceRange = values.priceRange ? Number(values.priceRange) : null;
    if (
      !values.name.trim() ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      (priceRange !== null && ![1, 2, 3].includes(priceRange))
    ) {
      setFormError(
        'Tên địa điểm, tọa độ hợp lệ là bắt buộc. Phân khúc giá chỉ nhận 1, 2 hoặc 3.',
      );
      return;
    }

    const request: PlaceCreationRequest = {
      name: values.name.trim(),
      category: optionalText(values.category),
      address: optionalText(values.address),
      imageUrl: optionalText(values.imageUrl),
      priceRange,
      latitude,
      longitude,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateAdminPlace(editing.id, request);
        setNotice('Đã cập nhật địa điểm.');
      } else {
        await createAdminPlace(request);
        setNotice('Đã thêm địa điểm.');
      }
      setFormOpen(false);
      setEditing(null);
      await loadPlaces();
    } catch (requestError) {
      setFormError(normalizeApiError(requestError).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      await deleteAdminPlace(deleteTarget.id);
      setNotice(`Đã xóa địa điểm “${deleteTarget.name}”.`);
      setDeleteTarget(null);
      await loadPlaces();
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminPageFrame
      title="Quản lý địa điểm"
      subtitle="Quản lý danh mục địa điểm ăn uống trên toàn hệ thống."
      action={
        <Button onClick={openCreate} disabled={loading}>
          Thêm địa điểm
        </Button>
      }
    >
      {notice && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
      {!loading && !error && places.length > 0 && (
        <AdminSearchInput
          label="Tìm địa điểm"
          placeholder="Tên, danh mục hoặc địa chỉ"
          value={query}
          onChange={setQuery}
        />
      )}
      <AdminRequestState
        loading={loading}
        error={error}
        onRetry={() => void loadPlaces()}
        empty={filteredPlaces.length === 0}
      >
        <>
          <AdminMobileList>
            {filteredPlaces.map((place) => (
              <Card
                key={place.id}
                title={place.name}
                description={place.category || 'Chưa phân loại'}
                headerAction={
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(place)}>
                      Sửa
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(place)}>
                      Xóa
                    </Button>
                  </div>
                }
              >
                <dl className="grid gap-2 text-body-sm">
                  <div>
                    <dt className="font-semibold text-muted-foreground">Địa chỉ</dt>
                    <dd>{place.address || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted-foreground">Tọa độ</dt>
                    <dd>
                      {place.latitude}, {place.longitude}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </AdminMobileList>
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeading>Tên</AdminTableHeading>
              <AdminTableHeading>Danh mục</AdminTableHeading>
              <AdminTableHeading>Địa chỉ</AdminTableHeading>
              <AdminTableHeading>Tọa độ</AdminTableHeading>
              <AdminTableHeading>Thao tác</AdminTableHeading>
            </AdminTableHeader>
            <tbody>
              {filteredPlaces.map((place) => (
                <tr key={place.id}>
                  <AdminTableCell>{place.name}</AdminTableCell>
                  <AdminTableCell>{place.category || '—'}</AdminTableCell>
                  <AdminTableCell>{place.address || '—'}</AdminTableCell>
                  <AdminTableCell>
                    {place.latitude}, {place.longitude}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(place)}>
                        Sửa
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(place)}>
                        Xóa
                      </Button>
                    </div>
                  </AdminTableCell>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </>
      </AdminRequestState>

      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setFormError(null);
          }
        }}
        title={editing ? 'Cập nhật địa điểm' : 'Thêm địa điểm'}
        description="Nhập thông tin địa điểm. Tọa độ cần nằm trong giới hạn hợp lệ."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setFormError(null);
              }}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" form={PLACE_FORM_ID} loading={saving} loadingText="Đang lưu...">
              Lưu địa điểm
            </Button>
          </div>
        }
      >
        <form id={PLACE_FORM_ID} className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          {formError && (
            <Alert className="sm:col-span-2" variant="danger" role="alert">
              {formError}
            </Alert>
          )}
          <Input
            className="sm:col-span-2"
            label="Tên địa điểm"
            name="name"
            required
            value={values.name}
            onChange={(event) => updateField('name', event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            label="Danh mục"
            name="category"
            value={values.category}
            onChange={(event) => updateField('category', event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            label="Địa chỉ"
            name="address"
            value={values.address}
            onChange={(event) => updateField('address', event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            className="sm:col-span-2"
            label="URL hình ảnh"
            name="imageUrl"
            type="url"
            value={values.imageUrl}
            onChange={(event) => updateField('imageUrl', event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            label="Vĩ độ"
            name="latitude"
            type="number"
            min={-90}
            max={90}
            step="any"
            required
            value={values.latitude}
            onChange={(event) => updateField('latitude', event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            label="Kinh độ"
            name="longitude"
            type="number"
            min={-180}
            max={180}
            step="any"
            required
            value={values.longitude}
            onChange={(event) => updateField('longitude', event.currentTarget.value)}
            disabled={saving}
          />
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-body-sm font-semibold text-foreground">Phân khúc giá</span>
            <select
              className="focus-ring h-11 w-full rounded-control border border-input bg-card px-4 text-body text-foreground"
              name="priceRange"
              value={values.priceRange}
              onChange={(event) => updateField('priceRange', event.currentTarget.value)}
              disabled={saving}
            >
              <option value="">Không chỉ định</option>
              <option value="1">1 — Thấp</option>
              <option value="2">2 — Trung bình</option>
              <option value="3">3 — Cao</option>
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xóa địa điểm"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa “${deleteTarget.name}”? Thao tác này không thể hoàn tác.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleting}>
              Xóa địa điểm
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          Địa điểm sẽ bị xóa khỏi danh mục hệ thống.
        </p>
      </Modal>
    </AdminPageFrame>
  );
}
