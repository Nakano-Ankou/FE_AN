import { useState } from "react"
import { useLocation } from "react-router-dom"
import { AuthLayout } from "../../components/layout"
import { Toast } from "../../components/ui/feedback/Toast"
import LoginForm from "../../features/auth/LoginForm"

export default function Login() {
  const location = useLocation()
  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state as { signupSuccessMessage?: unknown } | null
    return typeof state?.signupSuccessMessage === "string" ? state.signupSuccessMessage : null
  })

  return (
    <AuthLayout title="Đăng nhập" subtitle="Hôm nay ăn gì">
      {successMessage && (
        <Toast
          className="mb-5"
          type="success"
          message={successMessage}
          isVisible
          onClose={() => setSuccessMessage(null)}
        />
      )}
      <p className="mb-5 text-center text-body-sm text-muted-foreground">
        Đăng nhập bằng tài khoản của bạn.
      </p>
      <LoginForm />
    </AuthLayout>
  )
}
