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

  return (
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
  );
};

export { LoginForm };
