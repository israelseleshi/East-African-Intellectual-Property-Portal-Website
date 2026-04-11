import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md my-4 rounded-none">
        <div className="flex justify-center pt-6 pb-2">
          <Skeleton className="h-16 w-48" />
        </div>
        <CardHeader className="space-y-1 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function LoginPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md my-4 rounded-none">
        <div className="flex justify-center pt-6 pb-2">
          <Skeleton className="h-16 w-48" />
        </div>
        <CardHeader className="space-y-1 text-center">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function SignUpPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md my-4 rounded-none">
        <div className="flex justify-center pt-6 pb-2">
          <Skeleton className="h-16 w-48" />
        </div>
        <CardHeader className="space-y-1 text-center pb-2">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </CardHeader>
        <div className="px-6">
          <Skeleton className="h-2 w-full" />
        </div>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-12 hidden sm:block" />
                {i < 3 && <Skeleton className="h-px w-8 sm:w-12" />}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full ml-auto" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ForgotPasswordPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md my-4 rounded-none">
        <div className="flex justify-center pt-6 pb-2">
          <Skeleton className="h-16 w-48" />
        </div>
        <CardHeader className="space-y-1 text-center">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function VerifyOtpPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md my-4 rounded-none">
        <div className="flex justify-center pt-6 pb-2">
          <Skeleton className="h-16 w-48" />
        </div>
        <CardHeader className="space-y-1 text-center">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-10" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
