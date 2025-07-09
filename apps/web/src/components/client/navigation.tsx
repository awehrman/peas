"use client";

import Link from "next/link";
import { Navigation } from "@peas/ui";

const NextLink = ({ ...props }: React.ComponentProps<typeof Link>) => {
  return <Link {...props} />;
};

export default function ClientNavigation() {
  return <Navigation LinkComponent={NextLink} />;
}
