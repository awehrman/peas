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

const LoginForm = () => {
  const [actionState, action] = useActionState(login, EMPTY_ACTION_STATE);

  const safeActionState = actionState || EMPTY_ACTION_STATE;

  return (
    <Form action={action} actionState={safeActionState}>
      <Input
        name="email"
        placeholder="Email"
        defaultValue={safeActionState.payload?.get("email") as string}
      />
      <FieldError actionState={safeActionState} name="email" />

      <Input
        type="password"
        name="password"
        placeholder="Password"
        defaultValue={safeActionState.payload?.get("password") as string}
      />
      <FieldError actionState={safeActionState} name="password" />

      <SubmitButton label="Sign In" />
    </Form>
  );
};

export { LoginForm };
