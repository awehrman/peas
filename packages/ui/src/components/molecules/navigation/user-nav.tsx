import { Button } from "../../atoms/button";

interface UserNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserNav({ user }: UserNavProps) {
  return (
    <div className="flex items-center gap-4">
      {user ? (
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <span className="sr-only">Open user menu</span>
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || ""}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <span className="text-sm font-medium">
                {user.name?.[0] || user.email?.[0] || "?"}
              </span>
            </div>
          )}
        </Button>
      ) : (
        <Button variant="ghost" asChild>
          <a href="/login">Login</a>
        </Button>
      )}
    </div>
  );
}
