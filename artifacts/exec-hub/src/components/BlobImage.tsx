import { useEffect, useState } from 'react';
import { idb } from '@/lib/idb';
import { nowIso, uid, ymd } from '@/lib/util';
import type { Photo } from '@/lib/types';

export function BlobImage({ id, className, alt = '' }: { id: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    idb.getBlob(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url ? <img src={url} alt={alt} className={className} loading="lazy" /> : <div className={`${className} animate-pulse bg-ink/10`} />;
}

/** Reduce la foto (máx. 2000 px, JPEG) para no llenar el iPad. */
export async function savePhoto(file: File, meta: Partial<Photo> = {}): Promise<Photo> {
  const id = `photo-${uid()}`;
  let blob: Blob = file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b ?? file), 'image/jpeg', 0.85));
  } catch { /* formato no soportado: se guarda tal cual */ }
  await idb.setBlob(id, blob);
  return { id, caption: '', date: ymd(), createdAt: nowIso(), ...meta };
}
