import { useEffect, useState } from "react";
import { fetchFileBlobUrl } from "../lib/api";
import { FilePdf, FileXls, FileText, Image as ImageIcon } from "@phosphor-icons/react";

// Lazily loads an image blob (auth header can't be sent via <img src>).
export function FileThumb({ file, className = "" }) {
  const [url, setUrl] = useState(null);
  const isImage = (file.content_type || "").startsWith("image/");

  useEffect(() => {
    let active = true;
    let created = null;
    if (isImage) {
      fetchFileBlobUrl(file.id).then((u) => { if (active) { created = u; setUrl(u); } }).catch(() => {});
    }
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [file.id, isImage]);

  if (isImage) {
    return url
      ? <img src={url} alt={file.original_filename} className={className} data-testid={`thumb-${file.id}`} />
      : <div className={`${className} bg-slate-100 animate-pulse`} />;
  }
  const ct = file.content_type || "";
  const Icon = ct.includes("pdf") ? FilePdf : (ct.includes("sheet") || ct.includes("excel") || ct.includes("csv")) ? FileXls : FileText;
  const color = ct.includes("pdf") ? "text-red-500" : "text-emerald-600";
  return (
    <div className={`${className} flex items-center justify-center bg-slate-50`}>
      <Icon size={40} weight="fill" className={color} />
    </div>
  );
}

export function LogoImg({ fileId, fallback, className = "" }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true; let created = null;
    if (fileId) fetchFileBlobUrl(fileId).then((u) => { if (active) { created = u; setUrl(u); } }).catch(() => {});
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [fileId]);
  if (fileId && url) return <img src={url} alt="logo" className={className} />;
  return fallback;
}
