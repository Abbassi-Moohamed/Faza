import { permanentRedirect } from "next/navigation";

/**
 * The Faza app lives under `/faza`; the bare root is kept only to
 * forward old landings to the canonical entry point.
 */
export default function RootRedirect() {
  permanentRedirect("/faza");
}