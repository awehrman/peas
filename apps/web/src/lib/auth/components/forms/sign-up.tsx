"use client";

import { useActionState } from "react";
import { signUp } from "../../actions/sign-up";
import {
  EMPTY_ACTION_STATE,
  Form,
  FieldError,
  SubmitButton,
} from "@peas/features";
import { Input } from "@peas/ui";
import { UnauthenticatedLayout } from "../unauthenticated-layout";

const SignUpForm = () => {
  const [actionState, action] = useActionState(signUp, EMPTY_ACTION_STATE);

  return (
    <UnauthenticatedLayout
      title="Create Account"
      subtitle="Sign up to get started with Peas"
    >
      <Form action={action} actionState={actionState}>
        <Input
          name="username"
          placeholder="Username"
          defaultValue={actionState.payload?.get("username") as string}
        />
        <FieldError actionState={actionState} name="username" />

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

        <Input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          defaultValue={actionState.payload?.get("confirmPassword") as string}
        />
        <FieldError actionState={actionState} name="confirmPassword" />

        <SubmitButton label="Sign Up" />
      </Form>
    </UnauthenticatedLayout>
  );
};

export { SignUpForm };
