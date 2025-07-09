"use client";

import { useActionState } from "react";
import { Input } from "@peas/ui/components/ui/input";
import { EMPTY_ACTION_STATE, FieldError, Form, SubmitButton } from "../../form";
import { signIn as login } from "../actions/login";

export interface LoginFormProps {
  loginPath: string;
  className?: string;
}

export function LoginForm({ loginPath, className = "" }: LoginFormProps) {
  const [actionState, action] = useActionState(login, EMPTY_ACTION_STATE);

  return (
    <div
      className={`w-full max-w-md p-8 bg-card border border-border rounded-lg shadow-lg ${className}`}
    >
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-center text-foreground">
          Sign In
        </h1>
      </div>

      <Form action={action} actionState={actionState}>
        <Input
          name="email"
          placeholder="Email"
          defaultValue={actionState.payload?.get("email") as string}
        />
        <FieldError actionState={actionState} name="email" />

        <Input
          type="password"
          name="password"
          placeholder="Password"
          defaultValue={actionState.payload?.get("password") as string}
        />
        <FieldError actionState={actionState} name="password" />

        <SubmitButton label="Sign In" />
      </Form>
    </div>
  );
}
