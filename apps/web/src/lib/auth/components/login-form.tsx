"use client";

import { useActionState } from "react";
import { login } from "../actions/login";
import {
  EMPTY_ACTION_STATE,
  Form,
  FieldError,
  SubmitButton,
} from "@peas/features";
import { Input } from "@peas/ui";

interface LoginFormProps {
  error?: string;
}

const LoginForm = ({ error }: LoginFormProps) => {
  const [actionState, action] = useActionState(login, EMPTY_ACTION_STATE);

  return (
    <Form action={action} actionState={actionState}>
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error === "invalid-signup-code"
            ? "Invalid or missing sign-up code. Please contact an administrator for access."
            : error}
        </div>
      )}

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
  );
};

export { LoginForm };
