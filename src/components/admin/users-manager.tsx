"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, resetUserPassword, setUserActive, setUserRole } from "@/app/actions/users";
import type { SettingsState } from "@/app/actions/seo-settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "./ui";

type User = { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export function UsersManager({ users, me }: { users: User[]; me: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(createUser, null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work.");
      }
    });
  };

  return (
    <div className="grid gap-6">
      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {error}
        </p>
      ) : null}

      <Panel title={`People (${users.length})`}>
        <ul className="divide-y divide-rule">
          {users.map((u) => (
            <li key={u.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold text-ink">
                  {u.name}
                  {u.id === me ? <span className="ml-2 text-caption font-normal text-ink-3">that’s you</span> : null}
                  {!u.isActive ? <span className="ml-2 text-caption font-normal text-danger">deactivated</span> : null}
                </p>
                <p className="text-caption text-ink-3">
                  {u.email} · last signed in{" "}
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`role-${u.id}`}>
                  Role for {u.name}
                </label>
                <Select
                  id={`role-${u.id}`}
                  value={u.role}
                  disabled={u.id === me}
                  onChange={(e) => run(() => setUserRole(u.id, e.target.value as "SUPER_ADMIN" | "ADMIN" | "EDITOR"))}
                  className="w-44"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super admin</option>
                </Select>
                <button
                  type="button"
                  onClick={() => setResetting(resetting === u.id ? null : u.id)}
                  className="min-h-11 px-2 text-small text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  Reset password
                </button>
                {u.id !== me ? (
                  <button
                    type="button"
                    onClick={() => run(() => setUserActive(u.id, !u.isActive))}
                    className="min-h-11 px-2 text-small text-danger underline underline-offset-4"
                  >
                    {u.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                ) : null}
              </div>
              {resetting === u.id ? (
                <form
                  action={(fd) =>
                    startTransition(async () => {
                      const result = await resetUserPassword(u.id, fd);
                      if (result && !result.ok) setError(result.error);
                      else {
                        setResetting(null);
                        router.refresh();
                      }
                    })
                  }
                  className="sm:col-span-2"
                >
                  <div className="flex flex-wrap items-end gap-3 border border-rule bg-paper-2 p-4">
                    <Field label={`New password for ${u.name}`} htmlFor={`pw-${u.id}`} hint="At least 12 characters. They'll be signed out everywhere.">
                      <Input id={`pw-${u.id}`} name="password" type="text" autoComplete="new-password" className="w-72" />
                    </Field>
                    <Button type="submit" size="sm">
                      Set password
                    </Button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Add someone">
        <form action={action} className="grid gap-5 sm:grid-cols-2">
          {state?.ok ? (
            <p role="status" className="sm:col-span-2 border border-success/40 bg-success-soft px-4 py-3 text-small text-success">
              {state.message}
            </p>
          ) : null}
          {state && !state.ok ? (
            <p role="alert" className="sm:col-span-2 border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
              {state.error}
            </p>
          ) : null}
          <Field label="Name" htmlFor="name" required>
            <Input id="name" name="name" />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Role" htmlFor="role" required>
            <Select id="role" name="role" defaultValue="EDITOR" required>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </Select>
          </Field>
          <Field label="First password" htmlFor="password" required hint="At least 12 characters. Ask them to change it after signing in.">
            <Input id="password" name="password" type="text" autoComplete="new-password" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending}>
              Create account
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
