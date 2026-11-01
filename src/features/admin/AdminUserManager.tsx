import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/feedback/Alert';
import { Card } from '../../components/ui/display/Card';
import { Badge } from '../../components/ui/display/Badge';
import { Modal } from '../../components/ui/feedback/Modal';
import { Button, Input } from '../../components/ui/form';
import type { UserResponse } from '../../types';
import { normalizeApiError } from '../../services/apiClient';
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '../../services/adminService';
import { useUserStore } from '../../store/userStore';
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

const USER_FORM_ID = 'admin-user-form';

export default function AdminUserManager() {
  const currentUser = useUserStore((state) => state.currentUser);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getAdminUsers());
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      [user.username, user.email, user.id, ...user.roles]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [users, query]);

  function openEdit(user: UserResponse) {
    setFormOpen(true);
    setEditing(user);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? '');
    setFormError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (avatarUrl.trim()) {
      try {
        new URL(avatarUrl.trim());
      } catch {
        setFormError('URL ảnh đại diện không hợp lệ.');
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      await updateAdminUser(editing.id, {
        email: normalizedEmail,
        avatarUrl: avatarUrl.trim() || null,
      });
      setNotice(`Đã cập nhật tài khoản ${editing.username}.`);
      setFormOpen(false);
      setEditing(null);
      await loadUsers();
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
      await deleteAdminUser(deleteTarget.id);
      setNotice(`Đã xóa tài khoản ${deleteTarget.username}.`);
      setDeleteTarget(null);
      await loadUsers();
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setDeleting(false);
    }
  }

  function isAdmin(user: UserResponse): boolean {
    return user.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ADMIN');
  }

  function renderUserActions(user: UserResponse) {
    const protectedAccount = isAdmin(user) || user.id === currentUser?.id;
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
          Sửa hồ sơ
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setDeleteTarget(user)}
          disabled={protectedAccount}
          aria-label={`Xóa tài khoản ${user.username}`}
        >
          Xóa
        </Button>
      </div>
    );
  }

  return (
    <AdminPageFrame
      title="Quản lý người dùng"
      subtitle="Xem hồ sơ và quản lý thông tin người dùng theo quyền API hiện có."
    >
      {notice && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}
      {!loading && !error && users.length > 0 && (
        <AdminSearchInput
          label="Tìm người dùng"
          placeholder="Tên đăng nhập, email, ID hoặc role"
          value={query}
          onChange={setQuery}
        />
      )}
      <AdminRequestState
        loading={loading}
        error={error}
        onRetry={() => void loadUsers()}
        empty={filteredUsers.length === 0}
      >
        <>
          <AdminMobileList>
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                title={user.username}
                description={user.email}
                headerAction={
                  <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {user.status}
                  </Badge>
                }
              >
                <dl className="grid gap-3 text-body-sm">
                  <div>
                    <dt className="font-semibold text-muted-foreground">ID</dt>
                    <dd className="break-all">{user.id}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted-foreground">Vai trò</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={role.includes('ADMIN') ? 'info' : 'default'}>
                          {role}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted-foreground">Ngày tạo</dt>
                    <dd>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</dd>
                  </div>
                  <div>{renderUserActions(user)}</div>
                </dl>
              </Card>
            ))}
          </AdminMobileList>
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeading>Người dùng</AdminTableHeading>
              <AdminTableHeading>Trạng thái</AdminTableHeading>
              <AdminTableHeading>Vai trò</AdminTableHeading>
              <AdminTableHeading>Ngày tạo</AdminTableHeading>
              <AdminTableHeading>Thao tác</AdminTableHeading>
            </AdminTableHeader>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <AdminTableCell>
                    <span className="block font-semibold">{user.username}</span>
                    <span className="text-caption text-muted-foreground">{user.email}</span>
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {user.status}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={role.includes('ADMIN') ? 'info' : 'default'}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </AdminTableCell>
                  <AdminTableCell>{renderUserActions(user)}</AdminTableCell>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <p className="text-caption text-muted-foreground">
            Không thể xóa tài khoản Admin hoặc tài khoản đang đăng nhập. API hiện chưa hỗ trợ sửa
            trạng thái hay cấp quyền Admin.
          </p>
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
        title="Cập nhật hồ sơ người dùng"
        description={editing ? `Tài khoản: ${editing.username}` : undefined}
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
            <Button type="submit" form={USER_FORM_ID} loading={saving} loadingText="Đang lưu...">
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <form id={USER_FORM_ID} className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formError && (
            <Alert variant="danger" role="alert">
              {formError}
            </Alert>
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            disabled={saving}
          />
          <Input
            label="URL ảnh đại diện"
            name="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.currentTarget.value)}
            disabled={saving}
          />
          <p className="text-caption text-muted-foreground">
            Vai trò, mật khẩu và trạng thái không được thay đổi tại màn hình này.
          </p>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xóa người dùng"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa tài khoản “${deleteTarget.username}”? Thao tác này không thể hoàn tác.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleting}>
              Xóa tài khoản
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          Hành động này sẽ gửi yêu cầu xóa tài khoản tới máy chủ.
        </p>
      </Modal>
    </AdminPageFrame>
  );
}
