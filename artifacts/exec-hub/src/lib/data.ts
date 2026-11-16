import type { Cell, Column, ColumnType, Widget } from './types';
import { ymd } from './util';

export interface Table { name: string; columns: Column[]; rows: Cell[][] }

// ---------- Lectura de Excel / CSV ----------

export async function readTableFile(file: File): Promise<Table[]> {
  const name = file.name.replace(/\.(xlsx|xlsm|csv|tsv|txt)$/i, '');
  if (/\.(csv|tsv|txt)$/i.test(file.name)) {
    const text = await file.text();
    return [fromMatrix(name, parseCsv(text))];
  }
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const sheets = await readXlsxFile(file);
  return sheets
    .map((s) => fromMatrix(sheets.length > 1 ? `${name} · ${s.sheet}` : name, s.data as unknown[][]))
    .filter((t) => t.rows.length > 0);
}

export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function normalize(v: unknown): Cell {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : ymd(v);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v).trim();
}

const NUM_RE = /^-?\$?\s?-?[\d,]*\.?\d+%?$/;
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;

export function toNumber(v: Cell): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!NUM_RE.test(s)) return null;
  const n = Number(s.replace(/[$,\s%]/g, ''));
  if (!Number.isFinite(n)) return null;
  return s.endsWith('%') ? n / 100 : n;
}

function toIsoDate(v: Cell): string | null {
  if (typeof v !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/); // dd/mm/aaaa (México)
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function fromMatrix(name: string, matrix: unknown[][]): Table {
  // Primera fila con al menos 2 celdas = encabezados.
  const start = Math.max(0, matrix.findIndex((r) => r.filter((c) => c != null && c !== '').length >= 2));
  const header = (matrix[start] ?? []).map((h, i) => (h == null || h === '' ? `Columna ${i + 1}` : String(h).trim()));
  const seen = new Map<string, number>();
  const names = header.map((h) => {
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n ? `${h} (${n + 1})` : h;
  });
  const raw = matrix.slice(start + 1)
    .map((r) => names.map((_, i) => normalize(r[i])))
    .filter((r) => r.some((c) => c !== null));

  const columns: Column[] = names.map((n, i) => ({ name: n, type: inferType(raw.map((r) => r[i])) }));
  const rows = raw.map((r) => r.map((c, i) => {
    if (c === null) return null;
    if (columns[i].type === 'number') return toNumber(c);
    if (columns[i].type === 'date') return toIsoDate(c) ?? c;
    return typeof c === 'number' ? String(c) : c;
  }));
  return { name, columns, rows };
}

function inferType(values: Cell[]): ColumnType {
  const filled = values.filter((v) => v !== null).slice(0, 500);
  if (!filled.length) return 'text';
  const dates = filled.filter((v) => typeof v === 'string' && DATE_RE.test(v) && toIsoDate(v)).length;
  if (dates / filled.length > 0.8) return 'date';
  const nums = filled.filter((v) => toNumber(v) !== null).length;
  // Códigos tipo "SKU 00123" o claves numéricas con pocos valores distintos se tratan como texto.
  if (nums / filled.length > 0.9) return 'number';
  return 'text';
}

// ---------- Perfil de columnas (lo que se manda a la IA; nunca la tabla completa) ----------

export function profile(columns: Column[], rows: Cell[][]) {
  return columns.map((c, i) => {
    const vals = rows.map((r) => r[i]).filter((v) => v !== null);
    const distinct = new Set(vals.map(String)).size;
    const base = { name: c.name, type: c.type, sample: vals.slice(0, 5) as (string | number | null)[], distinct };
    if (c.type === 'number') {
      const nums = vals as number[];
      return { ...base, min: Math.min(...nums), max: Math.max(...nums), sum: round(nums.reduce((a, b) => a + b, 0)) };
    }
    if (c.type === 'date') {
      const s = (vals as string[]).slice().sort();
      return { ...base, min: s[0] ?? null, max: s[s.length - 1] ?? null };
    }
    return base;
  });
}

const round = (n: number) => Math.round(n * 100) / 100;

// ---------- Agregaciones ----------

export function aggregate(values: number[], agg: Widget['agg']): number {
  if (agg === 'count') return values.length;
  if (!values.length) return 0;
  switch (agg) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
  }
}

export function computeKpi(columns: Column[], rows: Cell[][], w: Widget): number {
  const mi = columns.findIndex((c) => c.name === w.metric);
  if (w.agg === 'count' || mi < 0) return rows.length;
  return aggregate(rows.map((r) => r[mi]).filter((v): v is number => typeof v === 'number'), w.agg);
}

export function computeSeries(columns: Column[], rows: Cell[][], w: Widget, limit = 12): { name: string; value: number }[] {
  const gi = columns.findIndex((c) => c.name === w.groupBy);
  const mi = columns.findIndex((c) => c.name === w.metric);
  if (gi < 0) return [];
  const isDate = columns[gi].type === 'date';
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    let key = r[gi] == null ? '(vacío)' : String(r[gi]);
    if (isDate && key.length >= 7) key = key.slice(0, 7); // agrupa por mes
    const v = mi >= 0 ? r[mi] : 1;
    if (!groups.has(key)) groups.set(key, []);
    if (typeof v === 'number') groups.get(key)!.push(v);
    else if (w.agg === 'count') groups.get(key)!.push(1);
  }
  let out = [...groups.entries()].map(([name, vals]) => ({ name, value: round(aggregate(vals, w.agg)) }));
  if (isDate || w.type === 'line') return out.sort((a, b) => a.name.localeCompare(b.name)).slice(-24);
  out = out.sort((a, b) => b.value - a.value);
  if (out.length > limit) {
    const rest = out.slice(limit - 1);
    out = [...out.slice(0, limit - 1), { name: 'Otros', value: round(rest.reduce((a, b) => a + b.value, 0)) }];
  }
  return out;
}

export function formatValue(v: number, format: Widget['format']): string {
  if (format === 'currency') return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: v >= 1000 ? 0 : 2 });
  if (format === 'percent') return `${(Math.abs(v) <= 1.5 ? v * 100 : v).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('es-MX', { maximumFractionDigits: 1 })} M`;
  return v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

/** Dashboard automático (sin IA) por si el servidor no tiene IA configurada. */
export function autoWidgets(columns: Column[]): Omit<Widget, 'id'>[] {
  const nums = columns.filter((c) => c.type === 'number');
  const texts = columns.filter((c) => c.type === 'text');
  const dates = columns.filter((c) => c.type === 'date');
  const isMoney = (n: string) => /venta|importe|monto|costo|precio|ingreso|utilidad|\$|total/i.test(n);
  const w: Omit<Widget, 'id'>[] = [{ type: 'kpi', title: 'Registros', metric: null, agg: 'count', groupBy: null, format: 'number', target: null }];
  nums.slice(0, 3).forEach((c) => w.push({ type: 'kpi', title: `Total ${c.name}`, metric: c.name, agg: 'sum', groupBy: null, format: isMoney(c.name) ? 'currency' : 'number', target: null }));
  if (nums[0] && dates[0]) w.push({ type: 'line', title: `${nums[0].name} por mes`, metric: nums[0].name, agg: 'sum', groupBy: dates[0].name, format: isMoney(nums[0].name) ? 'currency' : 'number', target: null });
  if (texts[0]) w.push({ type: 'bar', title: `${nums[0]?.name ?? 'Registros'} por ${texts[0].name}`, metric: nums[0]?.name ?? null, agg: nums[0] ? 'sum' : 'count', groupBy: texts[0].name, format: nums[0] && isMoney(nums[0].name) ? 'currency' : 'number', target: null });
  if (texts[1]) w.push({ type: 'pie', title: `Mezcla por ${texts[1].name}`, metric: nums[0]?.name ?? null, agg: nums[0] ? 'sum' : 'count', groupBy: texts[1].name, format: 'number', target: null });
  return w;
}

export const SAMPLE_CSV = `Fecha,Sucursal,Línea,Ventas,Meta,Unidades,Devoluciones
2026-07-05,Monterrey,Herramienta manual,1250000,1200000,8400,35
2026-07-12,Guadalajara,Eléctricos,980000,1050000,3100,22
2026-07-19,CDMX,Plomería,1430000,1300000,9900,41
2026-07-26,Mérida,Jardín,410000,450000,2200,9
2026-08-02,Monterrey,Eléctricos,1120000,1100000,3600,18
2026-08-09,Guadalajara,Herramienta manual,1010000,1000000,7300,27
2026-08-16,CDMX,Herramienta manual,1680000,1500000,11800,52
2026-08-23,Mérida,Plomería,450000,430000,3000,11
2026-09-06,Monterrey,Plomería,1190000,1150000,8100,30
2026-09-13,Guadalajara,Jardín,620000,700000,3900,15
2026-09-20,CDMX,Eléctricos,1520000,1450000,5200,33
2026-09-27,Mérida,Herramienta manual,520000,480000,3800,12
2026-10-04,Monterrey,Herramienta manual,1330000,1250000,9100,29
2026-10-11,Guadalajara,Eléctricos,1060000,1080000,3400,25
2026-10-18,CDMX,Plomería,1590000,1500000,10900,47
2026-10-25,Mérida,Eléctricos,480000,500000,1700,8`;
