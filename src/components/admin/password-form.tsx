"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-constants";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, null);

  return (
    <form action={action} className="grid gap-5">
      {state?.ok ? (
        <p role="status" className="border border-success/40 bg-success-soft px-4 py-3 text-small text-success">
          Password changed. Any other device you were signed in on has been signed out.
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}
      <Field label="Current password" htmlFor="currentPassword" required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" required hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short sentence you'll remember beats a scramble you won't.`}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} />
      </Field>
      <Field label="New password again" htmlFor="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} />
      </Field>
      <Button type="submit" loading={pending} className="justify-self-start">
        Change password
      </Button>
    </form>
  );
}
