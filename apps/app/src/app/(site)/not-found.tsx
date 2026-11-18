import { NotFoundMessage } from "@/components/not-found-message";

// `notFound()` from a page in this group (an unknown event, place or club): inside the group's
// layout, which already draws the site's frame. Unmatched addresses use app/not-found.tsx.
export default function NotFound() {
  return <NotFoundMessage />;
}
