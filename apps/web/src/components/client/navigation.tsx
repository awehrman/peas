"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navigation } from "@peas/ui";
import { signOut } from "../../lib/auth/actions/sign-out";

const NextLink = ({ ...props }: React.ComponentProps<typeof Link>) => {
  return <Link {...props} />;
};

export default function ClientNavigation() {
  const pathname = usePathname();

  return (
    <Navigation
      LinkComponent={NextLink}
      pathname={pathname}
      signOut={signOut}
    />
  );
}
