"use client";

import { useMemo } from "react";
import { useApp, audienceMatches } from "@/store/app-store";
import { DIVISIONS, REGIONS } from "@/data/org";
import type { AudienceRules, Role } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";

export const EMPTY_RULES: AudienceRules = { divisionIds: [], regionIds: [], districtIds: [], roles: ["rep"], userIds: [] };

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** AG-1 audience builder: rules AND together within a row; values OR within a row. */
export function AudienceBuilder({ rules, onChange, limitToDistrictId }: { rules: AudienceRules; onChange: (r: AudienceRules) => void; limitToDistrictId?: string }) {
  const users = useApp((s) => s.users);
  const districts = useApp((s) => s.districts);
  const effective = limitToDistrictId ? { ...rules, districtIds: [limitToDistrictId] } : rules;
  const matched = useMemo(() => audienceMatches(users, effective), [users, effective]);
  const regions = REGIONS.filter((r) => !rules.divisionIds.length || rules.divisionIds.includes(r.divisionId));
  const dists = districts.filter((d) => !rules.regionIds.length || rules.regionIds.includes(d.regionId)).filter((d) => regions.some((r) => r.id === d.regionId));

  return (
    <div className="flex flex-col gap-4">
      {!limitToDistrictId && (
        <>
          <Row label="Role">
            {(["rep", "manager"] as Role[]).map((r) => <Chip key={r} size="lg" selected={rules.roles.includes(r)} onClick={() => onChange({ ...rules, roles: toggle(rules.roles, r) })}>{r === "rep" ? "Field reps" : "Managers"}</Chip>)}
          </Row>
          <Row label="Division">
            {DIVISIONS.map((d) => <Chip key={d.id} size="lg" selected={rules.divisionIds.includes(d.id)} onClick={() => onChange({ ...rules, divisionIds: toggle(rules.divisionIds, d.id), regionIds: [], districtIds: [] })}>{d.name} · {d.therapyArea}</Chip>)}
          </Row>
          <Row label="Region">
            {regions.map((r) => <Chip key={r.id} size="md" selected={rules.regionIds.includes(r.id)} onClick={() => onChange({ ...rules, regionIds: toggle(rules.regionIds, r.id), districtIds: [] })}>{r.name}</Chip>)}
          </Row>
          <Row label="District">
            {dists.map((d) => <Chip key={d.id} size="md" selected={rules.districtIds.includes(d.id)} onClick={() => onChange({ ...rules, districtIds: toggle(rules.districtIds, d.id) })}>{d.name}</Chip>)}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <Text size="body" weight="semibold" tone="subtle" className="w-24 shrink-0 pt-1.5">{label}</Text>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
