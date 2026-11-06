"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Film, Image as ImageIcon, Presentation, Sheet, ShieldCheck, ShieldAlert } from "lucide-react";
import type { FileFormat, Source } from "@/data/types";
import { isApproved, product } from "@/data/org";
import { DOC_PAGES } from "@/data/media";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";

/* Uploaded files stay in this browser tab only (object URLs); the store keeps their metadata. */
const FILES = new Map<string, { url: string; mime: string }>();
export const rememberFile = (id: string, file: File) => FILES.set(id, { url: URL.createObjectURL(file), mime: file.type });

export function formatOf(name: string): FileFormat {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (["csv", "tsv", "xls", "xlsx"].includes(ext)) return "data";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "other";
}

export const FORMAT_LABEL: Record<FileFormat, string> = { pdf: "PDF", slides: "Slides", doc: "Document", video: "Video", data: "Data", image: "Image", other: "File" };
export const FORMAT_ICON: Record<FileFormat, typeof FileText> = { pdf: FileText, slides: Presentation, doc: FileText, video: Film, data: Sheet, image: ImageIcon, other: FileText };

/** What a tile says about a source: its kind, size and number. */
export function sourceMeta(s: Source) {
  if (s.uploaded) return `${FORMAT_LABEL[s.uploaded.format]} · ${s.uploaded.fileName}`;
  return `${s.type} · ${s.pages} pages${s.docNumber ? ` · ${s.docNumber}` : ""}`;
}

export function ApprovalChip({ s }: { s: Source }) {
  return isApproved(s)
    ? <Chip size="xs" tone="ok" iconLeft={<ShieldCheck className="size-3" aria-hidden="true" />}>MLR approved</Chip>
    : <Chip size="xs" tone="warn" iconLeft={<ShieldAlert className="size-3" aria-hidden="true" />}>Needs MLR approval</Chip>;
}

export function SourcePreview({ s, onClose }: { s: Source; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="lg" title={s.title}
      description={[s.uploaded ? `Uploaded ${new Date(s.uploaded.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : s.type, product(s.productId)?.brand].filter(Boolean).join(" · ")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalChip s={s} />
          <Text size="caption" tone="subtle">{isApproved(s) ? `${s.docNumber} · SwishX can cite it as is.` : "SwishX can use it, but every sentence that cites it is flagged in checks, and the file goes to MLR with the course."}</Text>
        </div>
        {s.uploaded ? <UploadedFile s={s} /> : <ApprovedDocument s={s} />}
      </div>
    </Modal>
  );
}

function UploadedFile({ s }: { s: Source }) {
  const f = FILES.get(s.id);
  const format = s.uploaded!.format;
  const [rows, setRows] = useState<string[][] | null>(null);

  useEffect(() => {
    if (!f || format !== "data" || !/csv|tab-separated|plain/.test(f.mime)) return;
    void fetch(f.url).then((r) => r.text()).then((t) => setRows(t.trim().split(/\r?\n/).slice(0, 13).map((l) => l.split(/,|\t/))));
  }, [f, format]);

  if (!f) return <Empty text="The original file is kept for the MLR package. In this prototype, previews last only until the page reloads." />;
  if (format === "pdf") return <iframe src={f.url} title={s.title} className="h-[65vh] w-full rounded-control border border-hair-2 bg-white" />;
  if (format === "image") return <img src={f.url} alt={s.title} className="max-h-[65vh] w-full rounded-control border border-hair-2 object-contain" />;
  if (format === "video") return <video src={f.url} controls className="max-h-[65vh] w-full rounded-control bg-ink" />;
  if (format === "data" && rows) {
    return (
      <div className="max-h-[60vh] overflow-auto rounded-control border border-hair-2">
        <table className="w-full text-body">
          <thead className="sticky top-0 bg-subtle"><tr>{rows[0].map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((r, i) => <tr key={i} className="border-t border-hair">{r.map((c, j) => <td key={j} className="px-3 py-1.5 text-ink-2">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return <Empty text={`${FORMAT_LABEL[format]} files can't be previewed in the browser. SwishX reads the text from it, and MLR gets the original.`} href={f.url} />;
}

function Empty({ text, href }: { text: string; href?: string }) {
  return (
    <div className="squircle flex flex-col items-center gap-3 rounded-panel border border-dashed border-hair-2 px-6 py-12 text-center">
      <FileText className="size-8 text-ink-4" aria-hidden="true" />
      <Text size="body" tone="muted" className="max-w-[46ch]">{text}</Text>
      {href && <a href={href} download className="text-body font-semibold text-brand-deep underline">Download the file</a>}
    </div>
  );
}

/** Approved library documents, page by page. Pages without stored text show as placeholders. */
function ApprovedDocument({ s }: { s: Source }) {
  const [page, setPage] = useState(1);
  const content = DOC_PAGES[s.id]?.[page];
  return (
    <div className="flex flex-col gap-3">
      <div className="squircle mx-auto flex aspect-[8.5/11] w-full max-w-[520px] flex-col gap-3 rounded-control border border-hair-2 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between border-b border-hair pb-2 text-micro font-semibold uppercase tracking-wider text-ink-4"><span className="truncate">{s.title}</span><span>Page {page}</span></div>
        {content ? (
          <>
            <Text size="title" weight="bold">{content.title}</Text>
            {content.sections.map((sec, k) => (
              <div key={k} className="flex flex-col gap-1">{sec.h && <Text size="body" weight="bold">{sec.h}</Text>}<Text size="body" tone="muted" className="leading-relaxed">{sec.p}</Text></div>
            ))}
          </>
        ) : page === 1 ? (
          <div className="flex flex-1 flex-col justify-center gap-2 text-center">
            <Text size="display" weight="extrabold">{s.title}</Text>
            <Text size="body" tone="subtle">{s.type}{product(s.productId) ? ` · ${product(s.productId)!.brand}` : ""}</Text>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5" aria-label={`Page ${page}`}>
            {[92, 100, 84, 96, 70, 100, 88, 60].map((w, i) => <span key={i} className="h-2.5 rounded-full bg-black/[0.07]" style={{ width: `${w}%` }} />)}
          </div>
        )}
        <div className="mt-auto border-t border-hair pt-2 text-center font-mono text-micro text-ink-4">{s.docNumber} · Approved for internal training use</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
        <Text size="caption" tone="subtle" tabular>Page {page} of {s.pages}</Text>
        <Button variant="secondary" size="sm" disabled={page === s.pages} onClick={() => setPage(page + 1)}>Next<ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
  );
}
