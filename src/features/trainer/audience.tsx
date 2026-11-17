"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, audienceMatches } from "@/store/app-store";
import { DIVISIONS, REGIONS } from "@/data/org";
import type { AudienceRules, Role, User } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";

export const EMPTY_RULES: AudienceRules = { divisionIds: [], regionIds: [], districtIds: [], roles: ["rep"], userIds: [] };

/**
 * The role row (reps only, in v1) narrows a group; on its own it isn't a target. Without a division,
 * region, district or hire-date rule, only the people picked by name are assigned, so naming one rep
 * never quietly assigns everyone.
 */
export const targetRules = (r: AudienceRules): AudienceRules =>
  r.divisionIds.length || r.regionIds.length || r.districtIds.length || r.hiredWithinDays ? r : { ...r, roles: [] };

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** AG-1 audience builder: rules AND together within a row; values OR within a row. */
export function AudienceBuilder({ rules, onChange, limitToDistrictId, hideCount }: { rules: AudienceRules; onChange: (r: AudienceRules) => void; limitToDistrictId?: string; hideCount?: boolean }) {
  const users = useApp((s) => s.users);
  const districts = useApp((s) => s.districts);
  const effective = limitToDistrictId ? { ...rules, districtIds: [limitToDistrictId] } : targetRules(rules);
  const matched = useMemo(() => audienceMatches(users, effective), [users, effective]);
  /* Headcounts follow the role row, so "Immunology · 180" means 180 of the people you're targeting. */
  const headcount = (where: (u: User) => boolean) => users.filter((u) => u.active && (!rules.roles.length || rules.roles.some((r) => u.roles.includes(r))) && where(u)).length;
  const teams = DIVISIONS.filter((d) => users.some((u) => u.active && u.divisionId === d.id));
  const regions = REGIONS.filter((r) => !rules.divisionIds.length || rules.divisionIds.includes(r.divisionId));
  const dists = districts.filter((d) => !rules.regionIds.length || rules.regionIds.includes(d.regionId)).filter((d) => regions.some((r) => r.id === d.regionId));

  return (
    <div className="flex flex-col gap-4">
      {!limitToDistrictId && (
        <>
          {/* v1-hidden: the Role row. v1 assigns to field reps only; rules default to reps. */}
          {false && <Row label="Role">
            {(["rep", "manager"] as Role[]).map((r) => <Chip key={r} size="lg" selected={rules.roles.includes(r)} onClick={() => onChange({ ...rules, roles: toggle(rules.roles, r) })}>{r === "rep" ? "Field reps" : "Managers"}</Chip>)}
          </Row>}
          <Row label="Division" hint="Only teams with people in the Academy.">
            {teams.map((d) => <Chip key={d.id} size="lg" selected={rules.divisionIds.includes(d.id)} onClick={() => onChange({ ...rules, divisionIds: toggle(rules.divisionIds, d.id), regionIds: [], districtIds: [] })}>{d.name} · {headcount((u) => u.divisionId === d.id)}</Chip>)}
          </Row>
          <Row label="Region" hint={rules.divisionIds.length ? undefined : "Pick a division to narrow these."}>
            {regions.map((r) => <Chip key={r.id} size="md" selected={rules.regionIds.includes(r.id)} onClick={() => onChange({ ...rules, regionIds: toggle(rules.regionIds, r.id), districtIds: [] })}>{r.name} · {headcount((u) => u.regionId === r.id)}</Chip>)}
          </Row>
          <Row label="District">
            {dists.map((d) => <Chip key={d.id} size="md" selected={rules.districtIds.includes(d.id)} onClick={() => onChange({ ...rules, districtIds: toggle(rules.districtIds, d.id) })}>{d.name} · {headcount((u) => u.districtId === d.id)}</Chip>)}
          </Row>
          <Row label="People" hint="Specific reps, on top of the rules above.">
            <PeoplePicker users={users} selected={rules.userIds} onChange={(userIds) => onChange({ ...rules, userIds })} />
          </Row>
          <Row label="Hire date">
            {[undefined, 90, 180].map((d) => <Chip key={String(d)} size="md" selected={rules.hiredWithinDays === d} onClick={() => onChange({ ...rules, hiredWithinDays: d })}>{d ? `Hired in the last ${d} days` : "Anyone"}</Chip>)}
          </Row>
        </>
      )}
      {!hideCount && <div className="squircle flex items-center gap-3 rounded-panel bg-ink px-4 py-3 text-white">
        <Text size="display" weight="extrabold" tone="inverse" tabular>{matched.length}</Text>
        <Text size="body-lg" tone="inverse" className="opacity-80">{matched.length === 1 ? "person matches" : "people match"} right now</Text>
      </div>}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex w-28 shrink-0 flex-col pt-1.5"><Text size="body" weight="semibold" tone="subtle">{label}</Text>{hint && <Text size="micro" tone="faint">{hint}</Text>}</div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Add named reps by search. Picked people get the course whatever the other rules say. */
function PeoplePicker({ users, selected, onChange, compact }: { users: User[]; selected: string[]; onChange: (ids: string[]) => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const reps = users.filter((u) => u.active && u.roles.includes("rep"));
  const hits = q.trim().length < 2 ? [] : reps.filter((u) => !selected.includes(u.id) && `${u.name} ${u.territory ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6);
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const u = users.find((x) => x.id === id);
            return u && (
              <span key={id} className="flex items-center gap-1 rounded-chip bg-tint py-1 pl-2.5 pr-1 text-body font-semibold text-brand-deep">
                {u.name}
                <button type="button" aria-label={`Remove ${u.name}`} onClick={() => onChange(selected.filter((x) => x !== id))} className="grid size-5 place-items-center rounded-full hover:bg-white/60"><X className="size-3.5" /></button>
              </span>
            );
          })}
        </div>
      )}
      <label className={cn("flex items-center gap-2 rounded-control border border-hair-2 bg-card px-3 focus-within:border-brand", compact ? "h-8" : "h-10")}>
        <Search className="size-4 text-ink-3" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={compact ? "Specific reps, by name or territory" : "Search reps by name or territory"} aria-label="Search reps" className={cn("h-full flex-1 bg-transparent outline-none", compact ? "text-body" : "text-body-lg")} />
      </label>
      {hits.length > 0 && (
        <ul className="flex flex-col rounded-control border border-hair bg-card">
          {hits.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => { onChange([...selected, u.id]); setQ(""); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-subtle">
                <span className="text-body-lg font-semibold">{u.name}</span>
                <span className="text-caption text-ink-3">{u.territory}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && hits.length === 0 && <Text size="caption" tone="subtle">No reps match “{q.trim()}”.</Text>}
    </div>
  );
}

/**
 * The same rules as the builder, sized for picking a team: the division up front, regions and districts
 * folded into one line until you narrow it, then hire date and named reps. Picking a region picks its
 * districts, so the two never contradict each other.
 */
export function CompactAudience({ rules, onChange }: { rules: AudienceRules; onChange: (r: AudienceRules) => void }) {
  const users = useApp((s) => s.users);
  const districts = useApp((s) => s.districts);
  const [narrow, setNarrow] = useState(rules.districtIds.length > 0 || rules.regionIds.length > 0);
  const headcount = (where: (u: User) => boolean) => users.filter((u) => u.active && u.roles.includes("rep") && where(u)).length;
  const teams = DIVISIONS.filter((d) => users.some((u) => u.active && u.divisionId === d.id));
  const regions = REGIONS.filter((r) => !rules.divisionIds.length || rules.divisionIds.includes(r.divisionId));
  const inRegion = (rid: string) => districts.filter((d) => d.regionId === rid);
  const picked = new Set(rules.districtIds);
  const setDistricts = (ids: string[]) => onChange({ ...rules, regionIds: [], districtIds: [...new Set(ids)] });
  const pickedRegions = regions.filter((r) => inRegion(r.id).length && inRegion(r.id).every((d) => picked.has(d.id)));
  const where = !picked.size
    ? `All of ${rules.divisionIds.length ? teams.filter((t) => rules.divisionIds.includes(t.id)).map((t) => t.name).join(" and ") : "the company"}`
    : [...pickedRegions.map((r) => r.name), ...districts.filter((d) => picked.has(d.id) && !pickedRegions.some((r) => r.id === d.regionId)).map((d) => d.name)].join(", ");

  return (
    <div className="-mt-1 flex flex-col">
      <CRow label="Team">
        {teams.map((d) => <Chip key={d.id} size="md" selected={rules.divisionIds.includes(d.id)} onClick={() => onChange({ ...rules, divisionIds: toggle(rules.divisionIds, d.id), regionIds: [], districtIds: [] })}>{d.name} · {headcount((u) => u.divisionId === d.id)}</Chip>)}
      </CRow>
      <CRow label="Where">
        <button type="button" aria-expanded={narrow} onClick={() => setNarrow(!narrow)} className="flex h-8 max-w-full items-center gap-1.5 rounded-control border border-hair-2 bg-card px-2.5 text-body font-semibold text-ink-2 transition-colors hover:border-hair-3">
          <span className="truncate">{where}</span><ChevronDown className={cn("size-3.5 shrink-0 text-ink-3 transition-transform", narrow && "rotate-180")} aria-hidden="true" />
        </button>
        {picked.size > 0 && <button type="button" onClick={() => setDistricts([])} className="text-caption font-semibold text-brand-deep hover:underline">Everywhere</button>}
        {narrow && (
          <ul className="mt-1 flex w-full flex-col gap-2 rounded-panel bg-subtle/70 p-3">
            {regions.map((r) => {
              const ds = inRegion(r.id);
              const all = ds.length > 0 && ds.every((d) => picked.has(d.id));
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-1.5">
                  <button type="button" aria-pressed={all} onClick={() => setDistricts(all ? rules.districtIds.filter((x) => !ds.some((d) => d.id === x)) : [...rules.districtIds, ...ds.map((d) => d.id)])}
                    className={cn("w-[112px] shrink-0 rounded-control px-2 py-1 text-left text-caption font-bold transition-colors", all ? "bg-brand text-white" : "text-ink-2 hover:bg-card")}>
                    {r.name} <span className={cn("font-semibold", all ? "text-white/80" : "text-ink-4")}>· {headcount((u) => u.regionId === r.id)}</span>
                  </button>
                  {ds.map((d) => (
                    <Chip key={d.id} size="sm" selected={picked.has(d.id)} onClick={() => setDistricts(toggle(rules.districtIds, d.id))}>{d.name} · {headcount((u) => u.districtId === d.id)}</Chip>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </CRow>
      <CRow label="Hired">
        {[undefined, 90, 180].map((d) => <Chip key={String(d)} size="sm" selected={rules.hiredWithinDays === d} onClick={() => onChange({ ...rules, hiredWithinDays: d })}>{d ? `Last ${d} days` : "Anytime"}</Chip>)}
      </CRow>
      <CRow label="Also add">
        <PeoplePicker users={users} selected={rules.userIds} onChange={(userIds) => onChange({ ...rules, userIds })} compact />
      </CRow>
    </div>
  );
}

function CRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-hair py-3 first:border-0 first:pt-0">
      <Text size="body" weight="semibold" tone="subtle" className="w-[72px] shrink-0 pt-1">{label}</Text>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
