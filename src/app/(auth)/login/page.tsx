import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
