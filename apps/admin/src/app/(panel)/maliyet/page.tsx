import { Card, PageTitle, Problem, Stat, Table } from '@/components/ui';
import { load } from '@/lib/api';
import { TASK, usd } from '@/lib/labels';
import type { Costs } from '@/lib/types';

const TASKS = ['IDENTIFY', 'DIAGNOSE', 'ASSISTANT', 'CARD_DRAFT'];

export default async function CostsPage() {
  const result = await load<Costs>('/costs?days=30');
  if ('error' in result) return <Problem message={result.error} />;
  const costs = result.data;
  const month = costs.days.reduce((sum, day) => sum + day.totalUsd, 0);
  return (
    <>
      <PageTitle title="Maliyet" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Bugün" value={usd(costs.todayUsd)} hint={`Alarm eşiği ${usd(costs.limitUsd)}`} />
        <Stat label="Son 30 gün" value={usd(month)} />
        <Stat label="Kindwise çağrısı" value={usd(costs.prices.kindwisePerCall)} hint="Varsayılan; KINDWISE_USD_PER_CALL ile ayarlanır" />
      </div>
      <Table head={['Gün', ...TASKS.map((task) => TASK[task]), 'Toplam']}>
        {costs.days.map((day) => (
          <tr key={day.day}>
            <td className="px-4 py-3 font-medium">{day.day}</td>
            {TASKS.map((task) => (
              <td key={task} className="px-4 py-3">
                {day.tasks[task] ? (
                  <>
                    {usd(day.tasks[task].costUsd)}
                    <span className="block text-xs text-slate-500">{day.tasks[task].calls} çağrı</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
            ))}
            <td className={`px-4 py-3 font-semibold ${day.totalUsd >= costs.limitUsd ? 'text-red-600' : ''}`}>{usd(day.totalUsd)}</td>
          </tr>
        ))}
        {costs.days.length === 0 && (
          <tr>
            <td colSpan={TASKS.length + 2} className="px-4 py-6 text-center text-slate-500">
              Henüz kayıt yok
            </td>
          </tr>
        )}
      </Table>
      <Card className="mt-6">
        <h2 className="mb-2 font-semibold">Fiyatlar</h2>
        <p className="mb-3 text-xs text-slate-500">Milyon token başına dolar, liste fiyatı. Tutarlar tahmindir; fatura esastır.</p>
        {Object.entries(costs.prices.claude).map(([model, price]) => (
          <p key={model} className="text-sm">
            {model}: girdi {price.input}, çıktı {price.output}, önbellek okuma {price.cacheRead}
          </p>
        ))}
      </Card>
    </>
  );
}
