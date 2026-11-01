import { useRef, useState, type FormEvent, type FocusEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/feedback/Alert';
import { Button, Input, PasswordInput } from '../../components/ui/form';
import { normalizeApiError } from '../../services/apiClient';
import { register } from '../../services/authService';

type SignupField = 'username' | 'email' | 'password';
type FieldErrors = Partial<Record<SignupField, string>>;

interface SignupValues {
  username: string;
  email: string;
  password: string;
}

function validateField(field: SignupField, values: SignupValues): string | undefined {
  switch (field) {
    case 'username':
      return values.username.trim().length < 3
        ? 'Tên đăng nhập phải có ít nhất 3 ký tự.'
        : undefined;
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
        ? undefined
        : 'Vui lòng nhập email hợp lệ.';
    case 'password':
      return values.password.length < 6
        ? 'Mật khẩu phải có ít nhất 6 ký tự.'
        : undefined;
  }
}

function validateValues(values: SignupValues): FieldErrors {
  return {
    username: validateField('username', values),
    email: validateField('email', values),
    password: validateField('password', values),
  };
}

function firstInvalidField(errors: FieldErrors): SignupField | undefined {
  return (['username', 'email', 'password'] as const).find((field) => errors[field]);
}

export default function SignupForm() {
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<SignupValues>({
    username: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: SignupField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerError(null);
  }

  function handleBlur(field: SignupField, event: FocusEvent<HTMLInputElement>) {
    setFieldErrors((current) => ({
      ...current,
      [field]: validateField(field, { ...values, [field]: event.currentTarget.value }),
    }));
  }

  function focusField(field: SignupField | undefined) {
    if (field === 'username') usernameRef.current?.focus();
    if (field === 'email') emailRef.current?.focus();
    if (field === 'password') passwordRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const errors = validateValues(values);
    setFieldErrors(errors);
    const invalidField = firstInvalidField(errors);
    if (invalidField) {
      focusField(invalidField);
      return;
    }

    setLoading(true);
    try {
      await register({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate('/login', {
        state: { signupSuccessMessage: 'Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.' },
      });
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <Input
        ref={usernameRef}
        autoComplete="username"
        label="Tên đăng nhập"
        name="username"
        required
        value={values.username}
        error={fieldErrors.username}
        onChange={(event) => updateField('username', event.currentTarget.value)}
        onBlur={(event) => handleBlur('username', event)}
        disabled={loading}
      />
      <Input
        ref={emailRef}
        autoComplete="email"
        label="Email"
        name="email"
        type="email"
        required
        value={values.email}
        error={fieldErrors.email}
        onChange={(event) => updateField('email', event.currentTarget.value)}
        onBlur={(event) => handleBlur('email', event)}
        disabled={loading}
      />
      <PasswordInput
        ref={passwordRef}
        autoComplete="new-password"
        label="Mật khẩu"
        name="password"
        required
        value={values.password}
        error={fieldErrors.password}
        showStrengthMeter
        onChange={(event) => updateField('password', event.currentTarget.value)}
        onBlur={(event) => handleBlur('password', event)}
        disabled={loading}
      />
      <Button type="submit" fullWidth loading={loading} loadingText="Đang tạo tài khoản...">
        Tạo tài khoản
      </Button>
      <p className="text-center text-body-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link className="focus-ring rounded-control font-semibold text-primary-strong" to="/login">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
