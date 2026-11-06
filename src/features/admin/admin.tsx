"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Upload, Plus, Search, PencilLine, FileText } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fmtDate } from "@/store/selectors";
import { COMPETENCIES, DIVISIONS, DOMAINS, ORG, PRODUCTS, REGIONS, source } from "@/data/org";
import type { Role, User } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Avatar } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";

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
      <PageHeading title="Organisation" description="Your company's Academy. Everything here is fictional demo data." />
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
        <SettingRow label="Brand colour" hint="Skins the rep app's accents. Contrast is checked against white text.">
          <input type="color" aria-label="Brand colour" value={s.settings.brandColor} onChange={(e) => s.updateOrgSettings({ brandColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-control border border-hair-2 bg-card p-1" />
          <span className="font-mono text-body">{s.settings.brandColor}</span>
        </SettingRow>
        <SettingRow label="Time zone"><select aria-label="Time zone" className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body-lg"><option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option></select></SettingRow>
        <div className="flex justify-end"><Button onClick={() => showToast("Organisation saved")}>Save</Button></div>
      </Card>
      <Card title="Structure">
        {DIVISIONS.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 border-b border-hair pb-3 last:border-0">
            <Text size="subhead" weight="bold">{d.name} <span className="font-normal text-ink-3">· {d.therapyArea}</span></Text>
            <div className="flex flex-wrap gap-2">{REGIONS.filter((r) => r.divisionId === d.id).map((r) => <Chip key={r.id} size="md">{r.name} · {s.districts.filter((x) => x.regionId === r.id).length} districts</Chip>)}</div>
          </div>
        ))}
      </Card>
      <Card title="Integrations" eyebrow="Later phase">
        {[["Single sign-on (SAML / OIDC)", "Okta, Microsoft Entra ID"], ["User provisioning (SCIM)", "Automatic joiners, movers and leavers"], ["Veeva Vault PromoMats", "Submit for MLR and sync approvals automatically"], ["LMS completion export (xAPI)", "Cornerstone, SuccessFactors, Workday Learning"]].map(([t, d]) => (
          <SettingRow key={t} label={t} hint={d}><Chip size="md">Coming later</Chip></SettingRow>
        ))}
      </Card>
      <Toast message={message} open={open} />
    </div>
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
      <PageHeading title="People" description={`${s.users.length} people across ${s.districts.length} districts. Access belongs to the role.`}
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
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <PageHeading title="Products" description="Brands, approved indications and therapy areas. Courses check content against the exact approved wording." />
      {PRODUCTS.map((p) => (
        <Card key={p.id} title={`${p.brand} (${p.generic})`} eyebrow={`${DIVISIONS.find((d) => d.id === p.divisionId)?.name} · ${p.therapyArea}`}>
          {p.indications.map((i) => (
            <div key={i.short} className="squircle flex flex-col gap-1 rounded-panel border border-hair bg-subtle px-4 py-3">
              <Text size="caption" weight="bold" tone="subtle">Indication · {i.short}</Text>
              <Text size="body-lg" className="leading-relaxed">{i.full}</Text>
            </div>
          ))}
          <div className="flex items-center gap-2 text-body text-ink-2"><FileText className="size-4" aria-hidden="true" />{source(p.piSourceId)?.title} · {source(p.piSourceId)?.docNumber}</div>
        </Card>
      ))}
    </div>
  );
}

export function AdminCompetencies() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [edit, setEdit] = useState<string | null>(null);
  const val = (id: string) => s.competencyEdits[id] ?? { name: COMPETENCIES.find((c) => c.id === id)!.name, description: COMPETENCIES.find((c) => c.id === id)!.description };
  const [draft, setDraft] = useState({ name: "", description: "" });
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <PageHeading title="Competency framework" description="Every block, question and rubric criterion is tagged to these. Screening, personalisation and analytics run on them. Edits apply to new course versions, never to approved ones." />
      {DOMAINS.map((d) => (
        <Card key={d.id} title={d.name}>
          {COMPETENCIES.filter((c) => c.domain === d.id).map((c) => (
            <div key={c.id} className="flex items-start gap-3 border-b border-hair pb-3 last:border-0">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5"><Text size="body-lg" weight="semibold">{val(c.id).name}</Text><Text size="body" tone="subtle">{val(c.id).description}</Text></div>
              {["c-safety", "c-dosing"].includes(c.id) && <Chip size="sm" tone="warn">Critical by default</Chip>}
              <Button size="sm" variant="ghost" onClick={() => { setEdit(c.id); setDraft(val(c.id)); }}><PencilLine className="size-4" aria-hidden="true" />Edit</Button>
            </div>
          ))}
        </Card>
      ))}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title="Edit competency" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => { s.editCompetency(edit, draft); setEdit(null); showToast("Saved · applies to new course versions"); }}>Save</Button></>}>
          <div className="flex flex-col gap-3">
            <Field label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Field label="Description" multiline rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: (e.target as unknown as HTMLTextAreaElement).value })} />
          </div>
        </Modal>
      )}
      <Toast message={message} open={open} />
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
      <PageHeading title="Settings" description="Organisation-wide defaults. Courses can override some of these." />
      <Card title="Proficiency bands">
        <SettingRow label="Developing from" hint="Below this is “Not yet”."><Num v={st.bands.developing} on={(n) => set({ bands: { ...st.bands, developing: n } })} /></SettingRow>
        <SettingRow label="Proficient from" hint="Reps at or above this test out of personalisable modules."><Num v={st.bands.proficient} on={(n) => set({ bands: { ...st.bands, proficient: n } })} /></SettingRow>
        <SettingRow label="Expert from"><Num v={st.bands.expert} on={(n) => set({ bands: { ...st.bands, expert: n } })} /></SettingRow>
      </Card>
      <Card title="Privacy & retention">
        <SettingRow label="Practice recordings delete after" hint="Practice is visible only to the rep."><Num v={st.practiceRetentionDays} on={(n) => set({ practiceRetentionDays: n })} suffix="days" /></SettingRow>
        <SettingRow label="Assessment recordings kept"><select aria-label="Recording retention" value={st.recordingRetention} onChange={(e) => set({ recordingRetention: e.target.value })} className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body-lg"><option>Certification validity + 1 year</option><option>Certification validity</option><option>3 years</option></select></SettingRow>
        <Field label="Voice consent notice (shown before the first voice session)" multiline rows={4} value={st.consentText} onChange={(e) => set({ consentText: (e.target as unknown as HTMLTextAreaElement).value })} />
      </Card>
      <Card title="Gamification">
        <SettingRow label="Leaderboards" hint="Never by assessment scores, compliance or sales data.">
          <Segmented aria-label="Leaderboards">
            <SegmentedButton active={st.leaderboard === "off"} onClick={() => set({ leaderboard: "off" })}>Off</SegmentedButton>
            <SegmentedButton active={st.leaderboard === "team"} onClick={() => set({ leaderboard: "team" })}>Team level</SegmentedButton>
            <SegmentedButton active={st.leaderboard === "optin"} onClick={() => set({ leaderboard: "optin" })}>Opt-in individual</SegmentedButton>
          </Segmented>
        </SettingRow>
        <SettingRow label="Weekends break the streak"><Toggle on={st.weekendBreaksStreak} set={(v) => set({ weekendBreaksStreak: v })} label="Weekends break streak" /></SettingRow>
      </Card>
      <Card title="Defaults">
        <SettingRow label="Recertify every"><Num v={st.recertMonths} on={(n) => set({ recertMonths: n })} suffix="months" /></SettingRow>
        <SettingRow label="Managers may assign published courses to their team"><Toggle on={st.managersMayAssign} set={(v) => set({ managersMayAssign: v })} label="Managers may assign" /></SettingRow>
      </Card>
      <div className="flex justify-end"><Button onClick={() => showToast("Settings saved")}>Save settings</Button></div>
      <Toast message={message} open={open} />
    </div>
  );
}

function Num({ v, on, suffix }: { v: number; on: (n: number) => void; suffix?: string }) {
  return <div className="flex items-center gap-2"><div className="w-24"><Field size="sm" type="number" value={v} onChange={(e) => on(Number(e.target.value))} aria-label="Value" /></div>{suffix && <Text tone="subtle">{suffix}</Text>}</div>;
}
function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-brand" : "bg-black/15"}`}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow-hair transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}
