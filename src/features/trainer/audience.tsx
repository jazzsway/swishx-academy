"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
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
export function AudienceBuilder({ rules, onChange, limitToDistrictId }: { rules: AudienceRules; onChange: (r: AudienceRules) => void; limitToDistrictId?: string }) {
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
      <div className="squircle flex items-center gap-3 rounded-panel bg-ink px-4 py-3 text-white">
        <Text size="display" weight="extrabold" tone="inverse" tabular>{matched.length}</Text>
        <Text size="body-lg" tone="inverse" className="opacity-80">{matched.length === 1 ? "person matches" : "people match"} right now</Text>
      </div>
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
function PeoplePicker({ users, selected, onChange }: { users: User[]; selected: string[]; onChange: (ids: string[]) => void }) {
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
      <label className="flex h-10 items-center gap-2 rounded-control border border-hair-2 bg-card px-3 focus-within:border-brand">
        <Search className="size-4 text-ink-3" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reps by name or territory" aria-label="Search reps" className="h-full flex-1 bg-transparent text-body-lg outline-none" />
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
