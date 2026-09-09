"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupplier, updateSupplier } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { supplierInputSchema } from "@/lib/validation/registers";

/**
 * Supplier Register create / edit Server Actions (Slice 2.4b). Each re-scopes
 * through the DAL (`withAccount` + RLS); the supplier id arrives as a bound
 * argument, never from the form body. Ids in the URL are opaque UUIDs (ticket
 * 06).
 */

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? undefined,
    contactPerson: formData.get("contactPerson") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    location: formData.get("location") ?? undefined,
    paymentTerms: formData.get("paymentTerms") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    status: formData.get("status") ?? undefined,
  };
}

export async function createSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    await createSupplier(parsed.data);
  } catch {
    return { error: "Could not save the supplier. Try again." };
  }

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplierAction(
  supplierId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateSupplier(supplierId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) return { error: "That supplier could not be found." };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
