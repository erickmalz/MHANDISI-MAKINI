"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSubcontractor, updateSubcontractor } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { subcontractorInputSchema } from "@/lib/validation/registers";

/**
 * Subcontractor Register create / edit Server Actions (Slice 2.4b). Each
 * re-scopes through the DAL (`withAccount` + RLS); the subcontractor id arrives
 * as a bound argument, never from the form body.
 */

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? undefined,
    trade: formData.get("trade") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    address: formData.get("address") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    status: formData.get("status") ?? undefined,
  };
}

export async function createSubcontractorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = subcontractorInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    await createSubcontractor(parsed.data);
  } catch {
    return { error: "Could not save the subcontractor. Try again." };
  }

  revalidatePath("/subcontractors");
  redirect("/subcontractors");
}

export async function updateSubcontractorAction(
  subcontractorId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = subcontractorInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateSubcontractor(subcontractorId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) return { error: "That subcontractor could not be found." };

  revalidatePath("/subcontractors");
  redirect("/subcontractors");
}
