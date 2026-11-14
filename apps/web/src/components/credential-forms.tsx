import { UnauthenticatedLayout } from "./unauthenticated-layout";
import {
  type CredentialFormState,
  loginFn,
  signUpFn,
} from "~/server/auth.functions";

import { useActionState } from "react";

import { useApolloClient } from "@apollo/client/react";
import { Input } from "@peas/components";
import {
  type ActionState,
  EMPTY_ACTION_STATE,
  FieldError,
  Form,
  SubmitButton,
} from "@peas/features";
import { useRouter } from "@tanstack/react-router";

type CredentialServerFn = (options: {
  data: FormData;
}) => Promise<CredentialFormState>;

/**
 * Runs a credential server function and adapts its result to the ActionState the @peas/features Form expects. The submitted FormData is re-attached so fields keep their values after an error; on success the router reloads the viewer and goes to the dashboard.
 */
function useCredentialAction(serverFn: CredentialServerFn) {
  const router = useRouter();
  const client = useApolloClient();

  return useActionState(
    async (
      _previous: ActionState,
      formData: FormData
    ): Promise<ActionState> => {
      try {
        const result = await serverFn({ data: formData });
        if (result.status === "SUCCESS") {
          await client.clearStore();
          await router.invalidate();
          await router.navigate({ to: "/" });
        }
        return { ...result, payload: formData, timestamp: Date.now() };
      } catch (error) {
        return {
          status: "ERROR",
          message:
            error instanceof Error ? error.message : "Something went wrong",
          fieldErrors: {},
          payload: formData,
          timestamp: Date.now(),
        };
      }
    },
    EMPTY_ACTION_STATE
  );
}

/** The form-level error (wrong password, closed sign-up); field errors render next to their inputs. */
function FormError({ actionState }: { actionState: ActionState }) {
  if (actionState.status !== "ERROR" || !actionState.message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {actionState.message}
    </p>
  );
}

function fieldValue(state: ActionState, name: string): string | undefined {
  const value = state.payload?.get(name);
  return typeof value === "string" ? value : undefined;
}

export function LoginForm({ error }: { error?: string }) {
  const [actionState, action] = useCredentialAction(loginFn);

  return (
    <UnauthenticatedLayout>
      <Form action={action} actionState={actionState}>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error === "invalid-signup-code"
              ? "Invalid or missing sign-up code. Please contact an administrator for access."
              : error}
          </div>
        )}
        <Input
          name="email"
          type="email"
          aria-label="Email"
          placeholder="Email"
          autoComplete="email"
          defaultValue={fieldValue(actionState, "email")}
        />
        <FieldError actionState={actionState} name="email" />
        <Input
          name="password"
          type="password"
          aria-label="Password"
          placeholder="Password"
          autoComplete="current-password"
          defaultValue={fieldValue(actionState, "password")}
        />
        <FieldError actionState={actionState} name="password" />
        <FormError actionState={actionState} />
        <SubmitButton label="Eat the Peas" />
      </Form>
    </UnauthenticatedLayout>
  );
}

export function SignUpForm({ code }: { code: string }) {
  const [actionState, action] = useCredentialAction(signUpFn);

  return (
    <UnauthenticatedLayout
      title="Create Account"
      subtitle="Sign up to get started with Peas"
    >
      <Form action={action} actionState={actionState}>
        <input type="hidden" name="code" value={code} />
        <Input
          name="username"
          aria-label="Username"
          placeholder="Username"
          autoComplete="username"
          defaultValue={fieldValue(actionState, "username")}
        />
        <FieldError actionState={actionState} name="username" />
        <Input
          name="email"
          type="email"
          aria-label="Email"
          placeholder="Email"
          autoComplete="email"
          defaultValue={fieldValue(actionState, "email")}
        />
        <FieldError actionState={actionState} name="email" />
        <Input
          name="password"
          type="password"
          aria-label="Password"
          placeholder="Password"
          autoComplete="new-password"
          defaultValue={fieldValue(actionState, "password")}
        />
        <FieldError actionState={actionState} name="password" />
        <Input
          name="confirmPassword"
          type="password"
          aria-label="Confirm password"
          placeholder="Confirm Password"
          autoComplete="new-password"
          defaultValue={fieldValue(actionState, "confirmPassword")}
        />
        <FieldError actionState={actionState} name="confirmPassword" />
        <FormError actionState={actionState} />
        <SubmitButton label="Sign Up" />
      </Form>
    </UnauthenticatedLayout>
  );
}
