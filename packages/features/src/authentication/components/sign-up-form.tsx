import { useActionState } from "react";
import { Input } from "@peas/ui/components/ui/input";
import { EMPTY_ACTION_STATE, FieldError, Form, SubmitButton } from "../../form";
import { signUp } from "../actions/sign-up";

export interface SignUpFormProps {
  loginPath: string;
  className?: string;
}

export function SignUpForm({ loginPath, className = "" }: SignUpFormProps) {
  const [actionState, action] = useActionState(signUp, EMPTY_ACTION_STATE);

  return (
    <div
      className={`w-full max-w-md p-8 bg-card border border-border rounded-lg shadow-lg ${className}`}
    >
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-center text-foreground">
          Create Account
        </h1>
        <p className="text-center text-muted-foreground">
          Enter your information to create a new account
        </p>
      </div>

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

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href={loginPath} className="text-primary hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}
