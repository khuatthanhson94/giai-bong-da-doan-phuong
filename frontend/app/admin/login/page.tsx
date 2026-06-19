import { Suspense } from "react";
import AdminLoginForm from "./LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Skeleton className="h-64 w-full max-w-md" /></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
