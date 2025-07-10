"use client";

import { useActionState } from "react";
import { signUp } from "../actions/sign-up";
import {
  EMPTY_ACTION_STATE,
  Form,
  FieldError,
  SubmitButton,
} from "@peas/features";
import { Input } from "@peas/ui";

const SignUpForm = () => {
  const [actionState, action] = useActionState(signUp, EMPTY_ACTION_STATE);

  // Provide fallback for undefined actionState
  const safeActionState = actionState || EMPTY_ACTION_STATE;

  return (
    <Form action={action} actionState={safeActionState}>
      <Input
        name="username"
        placeholder="Username"
        defaultValue={safeActionState.payload?.get("username") as string}
      />
      <FieldError actionState={safeActionState} name="username" />

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

      <Input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        defaultValue={safeActionState.payload?.get("confirmPassword") as string}
      />
      <FieldError actionState={safeActionState} name="confirmPassword" />

      <SubmitButton label="Sign Up" />
    </Form>
  );
};

export { SignUpForm };
