"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Upload, Plus, Search, FileText, ChevronDown, Send } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fmtDate, useMe } from "@/store/selectors";
import { COMPETENCIES, DIVISIONS, DOMAINS, ORG, PRODUCTS, REGIONS, source } from "@/data/org";
import type { Role, User } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/patterns/data-table";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Avatar } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";

function Intro({ description, actions }: { description: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Text as="p" size="body-lg" tone="subtle" className="max-w-[70ch]">{description}</Text>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-hair py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex max-w-[56ch] flex-col gap-0.5"><Text size="body-lg" weight="semibold">{label}</Text>{hint && <Text size="caption" tone="subtle">{hint}</Text>}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function AdminOrganisation() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [name, setName] = useState(ORG.name);
  const [logo, setLogo] = useState("");
  const reps = s.users.filter((u) => u.roles.includes("rep")).length;
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <Intro description="Your company's Academy: identity, structure and integrations." />
      <div className="grid gap-4 sm:grid-cols-4">
        {[["People", s.users.length], ["Field reps", reps], ["Districts", s.districts.length], ["Courses", s.courses.length]].map(([k, v]) => (
          <Card key={k as string} padded><Text size="caption" tone="subtle">{k}</Text><Text size="hero" weight="extrabold" tabular>{v}</Text></Card>
        ))}
      </div>
      <Card title="Identity">
        <Field label="Company name" value={name} onChange={(e) => setName(e.target.value)} />
        <SettingRow label="Logo" hint="Shown on certificates and the rep app.">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-hair-2 bg-card px-4 text-body-lg font-semibold hover:bg-subtle">
            <Upload className="size-4" aria-hidden="true" />{logo || "Upload logo"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0]?.name ?? "")} />
          </label>
        </SettingRow>
        <SettingRow label="Time zone"><select aria-label="Time zone" className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body-lg"><option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option></select></SettingRow>
        <div className="flex justify-end"><Button onClick={() => showToast("Organisation saved")}>Save</Button></div>
      </Card>
      <FieldStructure onSent={() => showToast("Sent to your SwishX team")} />
      <Card title="Integrations" eyebrow="Later phase">
        {[["Single sign-on (SAML / OIDC)", "Okta, Microsoft Entra ID"], ["User provisioning (SCIM)", "Automatic joiners, movers and leavers"], ["Veeva Vault PromoMats", "Submit for MLR and sync approvals automatically"], ["LMS completion export (xAPI)", "Cornerstone, SuccessFactors, Workday Learning"]].map(([t, d]) => (
          <SettingRow key={t} label={t} hint={d}><Chip size="md">Coming later</Chip></SettingRow>
        ))}
      </Card>
      <Toast message={message} open={open} />
    </div>
  );
}

/**
 * Field structure (divisions → regions → districts) is loaded by the SwishX team from the
 * client's org chart at onboarding. Clients check it here and request changes; they don't edit it.
 * Joiners and leavers stay self-serve under People.
 */
function FieldStructure({ onSent }: { onSent: () => void }) {
  const s = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const repsIn = (districtIds: string[]) => s.users.filter((u) => u.active && u.roles.includes("rep") && districtIds.includes(u.districtId ?? "")).length;
  const districtsOf = (regionIds: string[]) => s.districts.filter((d) => regionIds.includes(d.regionId));
  const live = DIVISIONS.filter((d) => REGIONS.some((r) => r.divisionId === d.id));
  const idle = DIVISIONS.filter((d) => !live.includes(d));
  const allDistricts = districtsOf(REGIONS.map((r) => r.id));

  return (
    <Card title="Field structure" eyebrow="Managed by your SwishX team"
      actions={<Button variant="secondary" onClick={() => setAsking(true)}><Send className="size-4" aria-hidden="true" />Request a change</Button>}>
      <Text as="p" size="body" tone="muted" className="-mt-2 max-w-[70ch]">
        Set up from the org chart you shared at onboarding, last updated {fmtDate(ORG.structureUpdatedAt, true)}. Reorganising? Send us the new structure and we&apos;ll update it. Everyone keeps their training history.
      </Text>
      <Text size="caption" tone="subtle">{live.length} divisions · {REGIONS.length} regions · {allDistricts.length} districts · {repsIn(allDistricts.map((d) => d.id))} reps</Text>

      <div className="flex flex-col">
        {live.map((d) => {
          const regions = REGIONS.filter((r) => r.divisionId === d.id);
          const dists = districtsOf(regions.map((r) => r.id));
          const expanded = open === d.id;
          return (
            <div key={d.id} className="border-b border-hair last:border-0">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : d.id)}
                className="flex w-full items-center gap-3 py-3 text-left">
                <span className="flex min-w-0 flex-1 flex-col">
                  <Text size="subhead" weight="bold">{d.name} <span className="font-normal text-ink-3">· {d.therapyArea}</span></Text>
                  <Text size="caption" tone="subtle">{regions.length} regions · {dists.length} districts · {repsIn(dists.map((x) => x.id))} reps</Text>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-ink-3 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {expanded && (
                <div className="grid gap-3 pb-4 sm:grid-cols-2">
                  {regions.map((r) => (
                    <div key={r.id} className="squircle flex flex-col gap-1.5 rounded-panel bg-subtle p-3.5">
                      <Text size="body-lg" weight="semibold">{r.name}</Text>
                      {districtsOf([r.id]).map((x) => (
                        <div key={x.id} className="flex items-baseline justify-between gap-3 text-body">
                          <span className="text-ink-2">{x.name} <span className="text-ink-3">· {s.users.find((u) => u.id === x.managerId)?.name ?? "No manager"}</span></span>
                          <span className="shrink-0 tabular-nums text-ink-3">{repsIn([x.id])} reps</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {idle.length > 0 && (
        <Text as="p" size="body" tone="subtle">
          Not in the Academy yet: {idle.map((d) => d.name).join(", ")}. Their products can still be used in courses; ask us to add a field team when they&apos;re ready.
        </Text>
      )}

      {s.structureRequests.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-hair pt-4">
          <Text size="label" weight="semibold" tone="muted">Your requests</Text>
          {s.structureRequests.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <Text size="body" weight="semibold">{r.kind}{r.effective ? ` · from ${fmtDate(r.effective, true)}` : ""}</Text>
                <Text size="caption" tone="subtle" className="line-clamp-2">{r.text}{r.file ? ` · ${r.file}` : ""}</Text>
              </div>
              <Chip size="sm" tone="warn">With SwishX · sent {fmtDate(r.at)}</Chip>
            </div>
          ))}
        </div>
      )}

      {asking && <StructureRequestModal onClose={() => setAsking(false)} onSent={() => { setAsking(false); onSent(); }} />}
    </Card>
  );
}

const REQUEST_KINDS = ["Realignment", "New region or district", "Add a division", "Something else"];

function StructureRequestModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const me = useMe();
  const send = useApp((s) => s.requestStructureChange);
  const [kind, setKind] = useState(REQUEST_KINDS[0]);
  const [text, setText] = useState("");
  const [effective, setEffective] = useState("");
  const [file, setFile] = useState("");
  return (
    <Modal open onClose={onClose} title="Request a structure change" size="lg"
      description="Your SwishX team makes the change, checks it with you, and keeps everyone's progress and certifications. We reply within 2 business days."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={text.trim().length < 10} onClick={() => { send({ kind, text: text.trim(), effective: effective || undefined, file: file || undefined, by: me.id }); onSent(); }}><Send className="size-4" aria-hidden="true" />Send to SwishX</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">What kind of change?</Text>
          <div className="flex flex-wrap gap-2">{REQUEST_KINDS.map((k) => <Chip key={k} size="lg" selected={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}</div>
        </div>
        <Field label="What's changing?" multiline rows={4} value={text} onChange={(e) => setText((e.target as unknown as HTMLTextAreaElement).value)}
          placeholder="e.g. From January 1, Texas splits into Texas North (manager: Ana Ruiz) and Texas South (manager: Ben Ito). Reps move with their territories." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Takes effect (optional)" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <Text size="label" weight="semibold" tone="muted">New org chart (optional)</Text>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold hover:bg-subtle">
              <Upload className="size-4" aria-hidden="true" /><span className="truncate">{file || "Attach a spreadsheet or PDF"}</span>
              <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
            </label>
          </div>
        </div>
        <div className="squircle rounded-panel bg-subtle px-4 py-3">
          <Text size="body" tone="muted">Just a new hire or a leaver? Add or deactivate them yourself under <Link href="/trainer/settings/people" className="font-semibold text-brand-deep underline">People</Link>.</Text>
        </div>
      </div>
    </Modal>
  );
}

export function AdminPeople() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [add, setAdd] = useState(false);
  const [csv, setCsv] = useState(false);
  const rows = s.users.filter((u) => (role === "all" || u.roles.includes(role)) && (!q || u.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="flex flex-col gap-6">
      <Intro description={`${s.users.length} people across ${s.districts.length} districts. Access belongs to the role.`}
        actions={<><Button variant="secondary" onClick={() => setCsv(true)}><Upload className="size-4" aria-hidden="true" />Import CSV</Button><Button onClick={() => setAdd(true)}><Plus className="size-4" aria-hidden="true" />Add person</Button></>} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[280px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></div>
        {(["all", "rep", "manager", "trainer", "admin"] as const).map((r) => <Chip key={r} size="lg" selected={role === r} onClick={() => setRole(r)}>{r === "all" ? "Everyone" : r[0].toUpperCase() + r.slice(1) + "s"}</Chip>)}
      </div>
      <DataTable<User>
        rows={rows.slice(0, 150)}
        rowKey={(u) => u.id}
        columns={[
          { key: "n", header: "Name", cell: (u) => <div className="flex items-center gap-2.5"><Avatar initials={u.initials} size={30} /><div className="flex flex-col"><span className="font-semibold text-ink">{u.name}</span><span className="text-caption text-ink-3">{u.email}</span></div></div> },
          { key: "r", header: "Roles", cell: (u) => <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Chip key={r} size="xs" tone={r === "rep" ? "default" : "brand"}>{r}</Chip>)}</div> },
          { key: "d", header: "District", secondary: true, cell: (u) => s.districts.find((d) => d.id === u.districtId)?.name ?? "—" },
          { key: "h", header: "Hired", secondary: true, cell: (u) => fmtDate(u.hireDate, true) },
          { key: "a", header: "Status", cell: (u) => (
            <button type="button" onClick={() => { s.setUserActive(u.id, !u.active); showToast(u.active ? `${u.first} deactivated · records kept` : `${u.first} reactivated`); }}
              className={`rounded-chip px-2 py-0.5 text-caption font-bold ${u.active ? "bg-ok-bg text-ok" : "bg-subtle text-ink-3"}`}>{u.active ? "Active" : "Deactivated"}</button>
          ) },
        ]}
      />
      {add && <AddPerson onClose={() => setAdd(false)} onAdded={(n) => showToast(`${n} added`)} />}
      {csv && <CsvImport onClose={() => setCsv(false)} onDone={(n) => showToast(`${n} people imported`)} />}
      <Toast message={message} open={open} />
    </div>
  );
}

function AddPerson({ onClose, onAdded }: { onClose: () => void; onAdded: (n: string) => void }) {
  const s = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("rep");
  const [districtId, setDistrictId] = useState("d-northeast");
  const d = s.districts.find((x) => x.id === districtId)!;
  const region = REGIONS.find((r) => r.id === d.regionId)!;
  return (
    <Modal open onClose={onClose} title="Add a person" description="They get the role's access, nothing more. Matching default courses are assigned automatically."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!name.trim() || !email.includes("@")} onClick={() => {
        s.addUser({ name: name.trim(), first: name.trim().split(" ")[0], email, roles: [role], title: role === "rep" ? "Specialist" : "District Manager", divisionId: region.divisionId, regionId: region.id, districtId, managerId: role === "rep" ? d.managerId : undefined, territory: d.name, hireDate: new Date().toISOString().slice(0, 10) });
        onAdded(name.trim()); onClose();
      }}>Add</Button></>}>
      <div className="flex flex-col gap-3">
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Work email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@corvana.example" />
        <Segmented aria-label="Role">{(["rep", "manager", "trainer"] as Role[]).map((r) => <SegmentedButton key={r} active={role === r} onClick={() => setRole(r)}>{r[0].toUpperCase() + r.slice(1)}</SegmentedButton>)}</Segmented>
        <label className="flex flex-col gap-1.5"><Text size="label" weight="semibold" tone="muted">District</Text>
          <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">{s.districts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </label>
      </div>
    </Modal>
  );
}

function CsvImport({ onClose, onDone }: { onClose: () => void; onDone: (n: number) => void }) {
  const s = useApp();
  const [text, setText] = useState("name,email,role,district\nJordan Lee,jordan.lee@corvana.example,rep,Northeast\nAva Brooks,ava.brooks@corvana.example,rep,Texas\nMissing Email,,rep,Texas");
  const parsed = useMemo(() => text.trim().split("\n").slice(1).map((line, i) => {
    const [name, email, role, district] = line.split(",").map((x) => x?.trim());
    const d = s.districts.find((x) => x.name.toLowerCase() === (district ?? "").toLowerCase());
    const err = !name ? "Missing name" : !email?.includes("@") ? "Missing or invalid email" : !d ? `Unknown district “${district}”` : !["rep", "manager"].includes(role) ? "Role must be rep or manager" : "";
    return { i, name, email, role: role as Role, d, err };
  }), [text, s.districts]);
  const ok = parsed.filter((p) => !p.err);
  return (
    <Modal open onClose={onClose} title="Import people from CSV" description="Columns: name, email, role, district. Check the preview before importing." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!ok.length} onClick={() => {
        for (const p of ok) { const region = REGIONS.find((r) => r.id === p.d!.regionId)!; s.addUser({ name: p.name, first: p.name.split(" ")[0], email: p.email, roles: [p.role], title: "Specialist", divisionId: region.divisionId, regionId: region.id, districtId: p.d!.id, managerId: p.d!.managerId, territory: p.d!.name, hireDate: new Date().toISOString().slice(0, 10) }); }
        onDone(ok.length); onClose();
      }}>Import {ok.length} valid row{ok.length === 1 ? "" : "s"}</Button></>}>
      <div className="flex flex-col gap-3">
        <textarea aria-label="CSV" rows={6} value={text} onChange={(e) => setText(e.target.value)} className="squircle rounded-control border border-hair-2 bg-card p-3 font-mono text-body outline-none focus:border-brand" />
        <div className="flex flex-col gap-1.5">
          {parsed.map((p) => (
            <div key={p.i} className={`flex items-center justify-between gap-3 rounded-chip px-3 py-2 text-body ${p.err ? "bg-danger-bg text-danger" : "bg-ok-bg text-ok"}`}>
              <span className="font-semibold">{p.name || "(no name)"}</span><span>{p.err || `${p.role} · ${p.d?.name}`}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function AdminProducts() {
  const [q, setQ] = useState("");
  const [div, setDiv] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const term = q.trim().toLowerCase();
  const rows = PRODUCTS.filter((p) => (div === "all" || p.divisionId === div) && (!term || `${p.brand} ${p.generic} ${p.therapyAreas.join(" ")} ${p.indications.map((i) => i.short).join(" ")}`.toLowerCase().includes(term)));
  const sel = PRODUCTS.find((p) => p.id === open);
  return (
    <div className="flex flex-col gap-6">
      <Intro description={`${PRODUCTS.length} products across ${DIVISIONS.length} divisions. Courses are checked against each product's exact approved indication wording.`} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[300px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search brand, molecule, indication" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" /></div>
        <Chip size="lg" selected={div === "all"} onClick={() => setDiv("all")}>All divisions</Chip>
        {DIVISIONS.map((d) => <Chip key={d.id} size="lg" selected={div === d.id} onClick={() => setDiv(d.id)}>{d.name}</Chip>)}
      </div>
      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => setOpen(p.id)}
        columns={[
          { key: "b", header: "Product", cell: (p) => (
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-chip text-caption font-black text-white" style={{ background: p.gradient }}>{p.brand.slice(0, 2).toUpperCase()}</span>
              <div className="flex flex-col"><span className="font-semibold text-ink">{p.brand}</span><span className="text-caption italic text-ink-3">{p.generic}</span></div>
            </div>
          ) },
          { key: "d", header: "Division", secondary: true, cell: (p) => DIVISIONS.find((d) => d.id === p.divisionId)?.name },
          { key: "i", header: "Indications", cell: (p) => p.indications.length ? <div className="flex flex-wrap gap-1">{p.indications.map((i) => <Chip key={i.short} size="xs" tone={i.isNew ? "brand" : "default"}>{i.short}{i.isNew ? " · new" : ""}</Chip>)}</div> : <span className="text-ink-4">—</span> },
          { key: "t", header: "Therapy areas", secondary: true, cell: (p) => p.therapyAreas.join(", ") },
          { key: "s", header: "Status", cell: (p) => <Chip size="xs" tone={p.status === "Awaiting approval" ? "warn" : p.status === "Launch" ? "brand" : "ok"}>{p.status}</Chip> },
        ]}
      />
      {sel && (
        <Modal open onClose={() => setOpen(null)} title={`${sel.brand} (${sel.generic})`} description={`${DIVISIONS.find((d) => d.id === sel.divisionId)?.name} · ${sel.form} · ${sel.status}`} size="lg">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5"><Text size="caption" weight="bold" tone="subtle">VARIANTS</Text><div className="flex flex-wrap gap-1.5">{sel.variants.map((v) => <Chip key={v} size="md">{v}</Chip>)}</div></div>
            {sel.indications.length === 0 && <Text tone="warn" weight="semibold">No approved label yet. Trainers can't build product courses on it until it's approved.</Text>}
            {sel.indications.map((i) => (
              <div key={i.short} className="squircle flex flex-col gap-1 rounded-panel border border-hair bg-subtle px-4 py-3">
                <Text size="caption" weight="bold" tone="subtle">Indication · {i.short}{i.isNew ? " · Newly approved" : ""}{i.variants?.length ? ` · ${i.variants.join(", ")} only` : ""}</Text>
                <Text size="body-lg" className="leading-relaxed">{i.full}</Text>
                <Text size="caption" tone="subtle">{i.therapyAreas.join(" · ")}</Text>
              </div>
            ))}
            {source(sel.piSourceId) && <div className="flex items-center gap-2 text-body text-ink-2"><FileText className="size-4" aria-hidden="true" />{source(sel.piSourceId)?.title} · {source(sel.piSourceId)?.docNumber}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AdminCompetencies() {
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <Intro description="Every block, question and rubric criterion is tagged to these. Screening, personalisation and analytics run on them. Your SwishX team sets the framework up with you during onboarding." />
      {DOMAINS.map((d) => (
        <Card key={d.id} title={d.name}>
          {COMPETENCIES.filter((c) => c.domain === d.id).map((c) => (
            <div key={c.id} className="flex items-start gap-3 border-b border-hair pb-3 last:border-0">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5"><Text size="body-lg" weight="semibold">{c.name}</Text><Text size="body" tone="subtle">{c.description}</Text></div>
              {["c-safety", "c-dosing"].includes(c.id) && <Chip size="sm" tone="warn">Critical by default</Chip>}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function AdminSettings() {
  const s = useApp();
  const st = s.settings;
  const set = s.updateOrgSettings;
  const { message, open, showToast } = useToast();
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <Intro description="What happens to recordings, and what reps agree to before their first voice session." />
      <Card title="Privacy & retention">
        <SettingRow label="Practice recordings delete after" hint="Practice is visible only to the rep."><Num v={st.practiceRetentionDays} on={(n) => set({ practiceRetentionDays: n })} suffix="days" /></SettingRow>
        <SettingRow label="Assessment recordings kept"><select aria-label="Recording retention" value={st.recordingRetention} onChange={(e) => set({ recordingRetention: e.target.value })} className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body-lg"><option>Certification validity + 1 year</option><option>Certification validity</option><option>3 years</option></select></SettingRow>
        <Field label="Voice consent notice (shown before the first voice session)" multiline rows={4} value={st.consentText} onChange={(e) => set({ consentText: (e.target as unknown as HTMLTextAreaElement).value })} />
      </Card>
      <div className="flex justify-end"><Button onClick={() => showToast("Saved")}>Save</Button></div>
      <Toast message={message} open={open} />
    </div>
  );
}

function Num({ v, on, suffix }: { v: number; on: (n: number) => void; suffix?: string }) {
  return <div className="flex items-center gap-2"><div className="w-24"><Field size="sm" type="number" value={v} onChange={(e) => on(Number(e.target.value))} aria-label="Value" /></div>{suffix && <Text tone="subtle">{suffix}</Text>}</div>;
}
