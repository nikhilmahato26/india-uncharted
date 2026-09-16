"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertCapability } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  const user = await assertCapability("enquiries.manage");
  const enquiry = await db.enquiry.update({
    where: { id },
    data: { status, contactedAt: status === "CONTACTED" ? new Date() : undefined },
    select: { refCode: true },
  });
  await recordAudit({ userId: user.id, action: `enquiry.${status.toLowerCase()}`, entityType: "Enquiry", entityId: id, label: enquiry.refCode });
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function addEnquiryNote(id: string, formData: FormData) {
  const user = await assertCapability("enquiries.read");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await db.enquiryNote.create({ data: { enquiryId: id, userId: user.id, body: body.slice(0, 4000) } });
  await recordAudit({ userId: user.id, action: "enquiry.note", entityType: "Enquiry", entityId: id });
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function assignEnquiry(id: string, userId: string | null) {
  const user = await assertCapability("enquiries.manage");
  await db.enquiry.update({ where: { id }, data: { assignedToId: userId } });
  await recordAudit({ userId: user.id, action: "enquiry.assign", entityType: "Enquiry", entityId: id });
  revalidatePath(`/admin/enquiries/${id}`);
}
