"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadControls, loadCciMap } from "@/lib/data/catalog";

export type CatalogLoadState = {
  ok?: boolean;
  error?: string;
  controlsAdded?: number;
  ccisAdded?: number;
};

/**
 * Load (or top up) the bundled NIST 800-53 Rev 5 catalog and DISA CCI list
 * into the database. Additive: existing rows are left untouched, new ones are
 * inserted. Admin only.
 */
export async function loadCatalogAction(): Promise<CatalogLoadState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { error: "Only administrators can manage the catalog." };
  }

  try {
    const controls = loadControls();
    const validControlIds = new Set(controls.map((c) => c.id));

    const before = await prisma.control.count();
    await prisma.control.createMany({
      data: controls.map((c) => ({
        id: c.id,
        family: c.family,
        title: c.title,
        text: c.text,
        baselineLow: c.baselines.includes("L"),
        baselineModerate: c.baselines.includes("M"),
        baselineHigh: c.baselines.includes("H"),
      })),
      skipDuplicates: true,
    });
    const controlsAdded = (await prisma.control.count()) - before;

    const cciMap = loadCciMap();
    const cciBefore = await prisma.cci.count();
    await prisma.cci.createMany({
      data: Object.entries(cciMap).map(([id, e]) => ({
        id,
        definition: e.definition,
        controlId: e.control && validControlIds.has(e.control) ? e.control : null,
      })),
      skipDuplicates: true,
    });
    const ccisAdded = (await prisma.cci.count()) - cciBefore;

    await prisma.activity.create({
      data: {
        actorId: user.id,
        verb: "loaded",
        entity: "Control",
        summary: `Loaded catalog bundle: +${controlsAdded} controls, +${ccisAdded} CCIs.`,
      },
    });

    revalidatePath("/controls");
    return { ok: true, controlsAdded, ccisAdded };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load catalog bundle.",
    };
  }
}
