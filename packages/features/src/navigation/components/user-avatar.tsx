import { cn } from "@peas/components";

import type { NavigationUser } from "../types/navigation";

interface UserAvatarProps {
  user: NavigationUser;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const { username, avatarUrl } = user;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15",
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="h-full w-full object-contain p-2.5"
        />
      ) : (
        <span
          role="img"
          aria-label={username}
          className="text-xl font-semibold uppercase text-navigation-foreground"
        >
          {username.charAt(0)}
        </span>
      )}
    </div>
  );
}
