import type { Course, Progress } from "@/data/types";

/**
 * A training with the trainer's own material: which of its files reps see is set file by file (shown to
 * reps, or context only); whether the ones they see are a step or optional is set once, in Settings.
 */

/** No file shown to reps: the training is the screening call, the assessments and the certificate. */
export const noMaterial = (c: Course) => !c.modules.length;

/** The material is there to look through any time, not a step before the assessments. Older assignments carried the choice themselves. */
export const materialOptional = (c: Course, p?: Progress) => c.settings.materialOptional ?? p?.mode === "optional";
