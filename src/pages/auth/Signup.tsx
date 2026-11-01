import { AuthLayout } from "../../components/layout"
import SignupForm from "../../features/auth/SignupForm"

export default function Signup() {
  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Hôm nay ăn gì">
      <p className="mb-5 text-center text-body-sm text-muted-foreground">
        Đăng ký để bắt đầu khám phá cùng bạn bè.
      </p>
      <SignupForm />
    </AuthLayout>
  )
}
