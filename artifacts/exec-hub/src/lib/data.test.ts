import { describe, expect, it } from 'vitest';
import { SAMPLE_CSV, computeKpi, computeSeries, formatValue, fromMatrix, parseCsv, toNumber } from './data';
import { parseIcs, buildIcs } from './ics';
import { isOverdue, runEngine } from './engine';
import { initialState } from './store';

describe('Excel / CSV', () => {
  const t = fromMatrix('Ventas', parseCsv(SAMPLE_CSV));

  it('detecta tipos de columna', () => {
    expect(t.columns.map((c) => c.type)).toEqual(['date', 'text', 'text', 'number', 'number', 'number', 'number']);
    expect(t.rows).toHaveLength(16);
  });

  it('lee números con formato mexicano y CSV con punto y coma', () => {
    expect(toNumber('$1,250,000')).toBe(1250000);
    expect(toNumber('12.5%')).toBeCloseTo(0.125);
    expect(toNumber('SKU-1')).toBeNull();
    const m = fromMatrix('x', parseCsv('Plaza;Venta\n"Monterrey, NL";10\nCDMX;5'));
    expect(m.rows[0]).toEqual(['Monterrey, NL', 10]);
  });

  it('convierte fechas dd/mm/aaaa', () => {
    const m = fromMatrix('x', parseCsv('Fecha,Monto\n05/07/2026,1\n12/07/2026,2'));
    expect(m.columns[0].type).toBe('date');
    expect(m.rows[0][0]).toBe('2026-07-05');
  });

  it('calcula KPIs y series agrupadas por mes', () => {
    const w = { id: '1', type: 'kpi' as const, title: '', metric: 'Ventas', agg: 'sum' as const, groupBy: null, format: 'currency' as const, target: null };
    expect(computeKpi(t.columns, t.rows, w)).toBe(16640000);
    const byMonth = computeSeries(t.columns, t.rows, { ...w, type: 'line', groupBy: 'Fecha' });
    expect(byMonth.map((d) => d.name)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    const bySucursal = computeSeries(t.columns, t.rows, { ...w, type: 'bar', groupBy: 'Sucursal' });
    expect(bySucursal[0].name).toBe('CDMX');
    expect(formatValue(0.92, 'percent')).toBe('92%');
  });
});

describe('Calendario .ics', () => {
  it('ida y vuelta conserva título y hora', () => {
    const ics = buildIcs([{ title: 'Comité, ventas', start: new Date(2026, 10, 20, 10, 0), end: new Date(2026, 10, 20, 11, 0), alarmMin: 10 }]);
    expect(ics).toContain('BEGIN:VALARM');
    const [ev] = parseIcs(ics);
    expect(ev.title).toBe('Comité, ventas');
    expect(ev.start).toBe('2026-11-20T10:00');
  });
});

describe('Motor de recordatorios', () => {
  it('dispara recordatorios vencidos una sola vez', () => {
    const s = initialState();
    s.automations = [];
    s.tasks = [{ id: 't', title: 'Llamar a Juan', priority: 'alta', done: false, remindAt: '2026-11-16T09:00', createdAt: '' }];
    const now = new Date(2026, 10, 16, 9, 5);
    const r1 = runEngine(s, now);
    expect(r1.notify).toHaveLength(1);
    expect(runEngine(r1.state, now).notify).toHaveLength(0);
  });

  it('el cierre del día corre una vez después de su hora', () => {
    const s = initialState();
    s.automations = s.automations.filter((a) => a.id === 'auto-evening');
    expect(runEngine(s, new Date(2026, 10, 16, 18, 0)).notify).toHaveLength(0);
    const r = runEngine(s, new Date(2026, 10, 16, 18, 45));
    expect(r.notify[0].title).toContain('Cierre');
    expect(runEngine(r.state, new Date(2026, 10, 16, 19, 0)).notify).toHaveLength(0);
  });

  it('marca vencidos solo después del día límite', () => {
    const base = { id: 'x', title: 'a', priority: 'media' as const, done: false, createdAt: '' };
    expect(isOverdue({ ...base, due: '2026-11-16' }, new Date(2026, 10, 16, 20))).toBe(false);
    expect(isOverdue({ ...base, due: '2026-11-15' }, new Date(2026, 10, 16, 8))).toBe(true);
  });
});
