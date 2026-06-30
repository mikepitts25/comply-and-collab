"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue="analyst@demo.mil"
          className="input"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="Password123!"
          className="input"
          required
        />
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
