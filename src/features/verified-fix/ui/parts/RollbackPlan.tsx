import { Undo2, Activity, Clock, User } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { ROLLBACK } from '../../model/phaseData';
import { useVfx } from './tokens';

// Phase 3 — rollback package. Generated alongside the draft so the case
// is reversible the moment it lands. The presence of this card is what
// makes auto-submit acceptable in the first place.

export function RollbackPlan({ caseId }: { caseId: string }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const plan = ROLLBACK[caseId];

  if (!plan) return null;

  const noPlan = plan.trigger.startsWith('n/a');

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Undo2 className="w-3 h-3" style={{ color: t.textMuted }} />
          <span
            className="text-xs font-black uppercase tracking-eyebrow"
            style={{ color: t.textMuted }}
          >
            {tr('rollback.title')}
          </span>
        </div>
        <span className="text-2xs font-mono" style={{ color: t.textFaint }}>
          {tr('rollback.subtitle')}
        </span>
      </div>

      {noPlan ? (
        <div className="text-sm" style={{ color: t.textFaint }}>
          {tr('rollback.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          <Field icon={Activity} label={tr('rollback.trigger')} value={plan.trigger} mono />
          <Field icon={Clock}    label={tr('rollback.window')}  value={plan.window} />
          <Field icon={Undo2}    label={tr('rollback.action')}  value={plan.action} mono />
          <Field icon={User}     label={tr('rollback.owner')}   value={plan.owner} mono />
        </div>
      )}

      {!noPlan && (
        <div
          className="mt-3 pt-3 border-t flex items-center gap-2"
          style={{ borderColor: t.borderHair }}
        >
          <span
            className="text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
            style={{ background: t.okSoft, color: t.ok }}
          >
            {tr('rollback.armed')}
          </span>
          <span className="text-xs" style={{ color: t.textMuted }}>
            {tr('rollback.armedHint')}
          </span>
        </div>
      )}
    </div>
  );
}

function Field({
  icon: Icon, label, value, mono,
}: {
  icon: typeof Undo2; label: string; value: string; mono?: boolean;
}) {
  const t = useVfx();
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: t.textFaint }} />
      <div className="min-w-0 flex-1">
        <div
          className="text-2xs font-bold uppercase tracking-[0.16em]"
          style={{ color: t.textFaint }}
        >
          {label}
        </div>
        <div
          className={`text-sm mt-0.5 leading-snug ${mono ? 'font-mono' : ''}`}
          style={{ color: t.textBody }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
