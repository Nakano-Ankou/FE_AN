import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert } from "../../components/ui/feedback/Alert";
import { Button, Input, PasswordInput } from "../../components/ui/form";
import { normalizeApiError } from "../../services/apiClient";
import { isAdminUser, useUserStore } from "../../store/userStore";

interface LoginDestination {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
}

function getLoginDestination(from: unknown, isAdmin: boolean): string {
  if (typeof from !== "object" || from === null || !("pathname" in from)) {
    return isAdmin ? "/admin" : "/app";
  }

  const destination = from as LoginDestination;
  if (typeof destination.pathname !== "string")
    return isAdmin ? "/admin" : "/app";

  const isAppPath =
    destination.pathname === "/app" || destination.pathname.startsWith("/app/");
  const isAdminPath =
    destination.pathname === "/admin" ||
    destination.pathname.startsWith("/admin/");
  if (!isAppPath && !(isAdmin && isAdminPath))
    return isAdmin ? "/admin" : "/app";

  const search =
    typeof destination.search === "string" ? destination.search : "";
  const hash = typeof destination.hash === "string" ? destination.hash : "";
  return `${destination.pathname}${search}${hash}`;
}

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useUserStore((state) => state.login);
  const currentUser = useUserStore((state) => state.currentUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setErrorMessage("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      await login({ username: normalizedUsername, password });
      const user = useUserStore.getState().currentUser;
      navigate(
        getLoginDestination(
          (location.state as { from?: unknown } | null)?.from,
          isAdminUser(user ?? currentUser),
        ),
        { replace: true },
      );
    } catch (error) {
      setErrorMessage(normalizeApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <Alert variant="danger" role="alert">
          {errorMessage}
        </Alert>
      )}
      <Input
        autoComplete="username"
        label="Tên đăng nhập"
        name="username"
        required
        value={username}
        onChange={(event) => setUsername(event.currentTarget.value)}
        disabled={loading}
      />
      <PasswordInput
        autoComplete="current-password"
        label="Mật khẩu"
        name="password"
        required
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
        disabled={loading}
      />
      <div className="flex justify-end">
        <Link
          className="focus-ring rounded-control text-body-sm font-semibold text-primary-strong"
          to="/forgot-password"
        >
          Quên mật khẩu?
        </Link>
      </div>
      <Button
        type="submit"
        fullWidth
        loading={loading}
        loadingText="Đang đăng nhập..."
      >
        Đăng nhập
      </Button>
      <p className="text-center text-body-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          className="focus-ring rounded-control font-semibold text-primary-strong"
          to="/signup"
        >
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
