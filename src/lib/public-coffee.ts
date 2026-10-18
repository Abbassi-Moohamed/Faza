import { notFound } from "next/navigation";

import { ApiClientError, getCoffeeBySlug } from "@/lib/api";
import type { CoffeeDto } from "@/types/backend";

/**
 * Resolves a public coffee for `/faza/:slug`. A missing coffee (404) or an
 * invalid slug (400) becomes a clean customer-facing not-found; anything else
 * surfaces to the branded error boundary — never raw backend details.
 */
export async function resolvePublicCoffee(slug: string): Promise<CoffeeDto> {
  try {
    return await getCoffeeBySlug(slug);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }
}