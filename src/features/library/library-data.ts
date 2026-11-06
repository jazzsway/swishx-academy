"use client";

import type { Block, Course, LibraryVisibility, Material, Module, User } from "@/data/types";
import { product, TODAY } from "@/data/org";
import { live } from "@/store/app-store";
import type { AppState } from "@/store/app-store";

/** Which division a course or material belongs to, for "matching audience" visibility. */
const divisionOf = (productId?: string, divisionId?: string) => product(productId)?.divisionId ?? divisionId;

function visibleTo(visibility: LibraryVisibility, user: User, productId?: string, divisionId?: string) {
  if (visibility === "assigned") return false;
  if (visibility === "everyone") return true;
  const div = divisionOf(productId, divisionId);
  return !div || div === user.divisionId;
}

/** Only published, in-date, approved content is ever in the Library. */
export function libraryCourses(s: AppState, user: User) {
  return s.courses.filter((c) => {
    const lv = live(c);
    if (!lv || (lv.expiresAt && new Date(lv.expiresAt) < TODAY)) return false;
    /* Teams picked at creation win over the product's division. */
    if (c.visibility === "audience" && c.teams?.length) return c.teams.includes(user.divisionId ?? "");
    return visibleTo(c.visibility, user, c.productId, c.divisionId);
  });
}

export function libraryMaterials(s: AppState, user: User) {
  return s.materials.filter((m) => (!m.expiresAt || new Date(m.expiresAt) >= TODAY) && visibleTo(m.visibility, user, m.productId));
}

export function resolveBlock(s: AppState, courseId: string, blockId: string): { course: Course; module: Module; block: Block } | null {
  const course = s.courses.find((c) => c.id === courseId);
  const lv = course && live(course);
  if (!course || !lv) return null;
  for (const m of lv.modules) {
    const b = m.blocks.find((x) => x.id === blockId);
    if (b) return { course, module: m, block: b };
  }
  return null;
}

export function materialBlocks(s: AppState, m: Material) {
  if (m.block) return [{ course: undefined, module: undefined, block: m.block }];
  return (m.items ?? []).map((it) => resolveBlock(s, it.courseId, it.blockId)).filter(Boolean) as { course: Course; module: Module; block: Block }[];
}

export function materialMinutes(s: AppState, m: Material) {
  return materialBlocks(s, m).reduce((a, x) => a + x.block.minutes, 0);
}

/** Prerequisites a rep hasn't certified yet. Screening stays locked until this is empty. */
export function unmetPrereqs(s: AppState, userId: string, course: Course) {
  return course.prerequisites
    .filter((pid) => !s.progress.some((p) => p.userId === userId && p.courseId === pid && p.state === "certified"))
    .map((pid) => s.courses.find((c) => c.id === pid)!)
    .filter(Boolean);
}

export const KIND_LABEL: Record<Material["kind"], string> = {
  playlist: "Playlist", graphic: "Graphic", reading: "Reading", visualaid: "Visual aid",
};

/** Search terms that point at off-label curiosity get a Medical Information pointer instead of a blank. */
export const OFF_LABEL_HINTS = ["pediatric", "paediatric", "teen", "adolescent", "children", "kids", "off-label", "off label", "pregnan"];
/** Comparison searches: there are no head-to-head data, so the answer is a reminder, not content. */
export const COMPARATIVE_HINTS = ["comparison", "compare", " vs", "versus", "better than", "head-to-head"];
