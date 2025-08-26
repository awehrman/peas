import { useActionFeedback } from "../hooks/use-action-feedback";
import { ActionState } from "../utils";

type FormProps = {
  action: (payload: FormData) => void;
  actionState: ActionState;
  children: React.ReactNode;
  onSuccess?: (actionState: ActionState) => void;
  onError?: (actionState: ActionState) => void;
};

const Form = ({
  action,
  actionState,
  children,
  onSuccess,
  onError,
}: FormProps) => {
  useActionFeedback(actionState, {
    onSuccess: ({ actionState }) => {
      onSuccess?.(actionState);
    },
    onError: ({ actionState }) => {
      if (actionState.message) {
        console.error("Form action failed:", actionState.message);
      }

      onError?.(actionState);
    },
  });

  return (
    <form
      action={action as (formData: FormData) => void}
      className="flex flex-col gap-y-2 bg-background"
    >
      {children}
    </form>
  );
};

export { Form };
