import { Search } from "lucide-react";
import { Placeholder } from "@peas/ui";

export default function NotFound() {
  return <Placeholder label="Page not found" icon={<Search />} />;
}
