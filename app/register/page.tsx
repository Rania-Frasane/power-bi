import { RegisterForm } from '@/components/auth/register-form'

export const metadata = {
  title: 'Register | Analytics Dashboard',
  description: 'Create a new analytics dashboard account',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
