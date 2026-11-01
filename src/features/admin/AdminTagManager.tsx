import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/feedback/Alert';
import { Card } from '../../components/ui/display/Card';
import { Modal } from '../../components/ui/feedback/Modal';
import { Button, Input } from '../../components/ui/form';
import type { TagResponse } from '../../types';
import { normalizeApiError } from '../../services/apiClient';
import {
  createAdminTag,
  deleteAdminTag,
  getAdminTags,
  updateAdminTag,
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

const TAG_FORM_ID = 'admin-tag-form';

export default function AdminTagManager() {
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TagResponse | null>(null);
  const [tagName, setTagName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTags(await getAdminTags());
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const filteredTags = tags.filter((tag) =>
    tag.tagName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  function openCreate() {
    setFormOpen(true);
    setEditing(null);
    setTagName('');
    setFormError(null);
    setNotice(null);
  }

  function openEdit(tag: TagResponse) {
    setFormOpen(true);
    setEditing(tag);
    setTagName(tag.tagName);
    setFormError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = tagName.trim();
    if (!normalizedName || normalizedName.length > 50) {
      setFormError('Tên Tag là bắt buộc và không được vượt quá 50 ký tự.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateAdminTag(editing.id, { tagName: normalizedName });
        setNotice('Đã cập nhật Tag.');
      } else {
        await createAdminTag({ tagName: normalizedName });
        setNotice('Đã tạo Tag.');
      }
      setFormOpen(false);
      setEditing(null);
      setTagName('');
      await loadTags();
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
      await deleteAdminTag(deleteTarget.id);
      setNotice(`Đã xóa Tag “${deleteTarget.tagName}”.`);
      setDeleteTarget(null);
      await loadTags();
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminPageFrame
      title="Tags hệ thống"
      subtitle="Quản lý các Tag sở thích dùng chung trong ứng dụng."
      action={
        <Button onClick={openCreate} disabled={loading}>
          Thêm Tag
        </Button>
      }
    >
      {notice && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
      {!loading && !error && tags.length > 0 && (
        <AdminSearchInput
          label="Tìm Tag"
          placeholder="Tìm theo tên Tag"
          value={query}
          onChange={setQuery}
        />
      )}
      <AdminRequestState
        loading={loading}
        error={error}
        onRetry={() => void loadTags()}
        empty={filteredTags.length === 0}
      >
        <>
          <AdminMobileList>
            {filteredTags.map((tag) => (
              <Card
                key={tag.id}
                title={tag.tagName}
                description={`ID: ${tag.id}`}
                headerAction={
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(tag)}>
                      Sửa
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(tag)}>
                      Xóa
                    </Button>
                  </div>
                }
              >
                <p className="text-body-sm text-muted-foreground">Tag sở thích hệ thống</p>
              </Card>
            ))}
          </AdminMobileList>
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeading>Tên Tag</AdminTableHeading>
              <AdminTableHeading>ID</AdminTableHeading>
              <AdminTableHeading>Thao tác</AdminTableHeading>
            </AdminTableHeader>
            <tbody>
              {filteredTags.map((tag) => (
                <tr key={tag.id}>
                  <AdminTableCell>{tag.tagName}</AdminTableCell>
                  <AdminTableCell>{tag.id}</AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(tag)}>
                        Sửa
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(tag)}>
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
            setEditing(null);
            setTagName('');
            setFormError(null);
          }
        }}
        title={editing ? 'Cập nhật Tag' : 'Tạo Tag'}
        description="Tên Tag không được để trống và tối đa 50 ký tự."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                setTagName('');
                setFormError(null);
              }}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" form={TAG_FORM_ID} loading={saving} loadingText="Đang lưu...">
              Lưu Tag
            </Button>
          </div>
        }
      >
        <form id={TAG_FORM_ID} className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formError && (
            <Alert variant="danger" role="alert">
              {formError}
            </Alert>
          )}
          <Input
            label="Tên Tag"
            name="tagName"
            required
            maxLength={50}
            value={tagName}
            onChange={(event) => setTagName(event.currentTarget.value)}
            disabled={saving}
          />
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xóa Tag"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa “${deleteTarget.tagName}”? Thao tác này không thể hoàn tác.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleting}>
              Xóa Tag
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          Tag bị xóa sẽ không còn xuất hiện trong danh mục hệ thống.
        </p>
      </Modal>
    </AdminPageFrame>
  );
}
