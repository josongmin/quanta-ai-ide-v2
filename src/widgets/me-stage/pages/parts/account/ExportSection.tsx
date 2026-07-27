import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Download } from 'lucide-react';
import { Section, Row, Button } from '@shared/ui/forms';
import { formatTime } from '@shared/i18n';

export function ExportSection() {
  const { t } = useTranslation('me');
  const [requested, setRequested] = useState(false);
  const requestedAt = useMemo(() => new Date(), []);
  return (
    <Section
      title={t('account.export.title')}
      hint={t('account.export.hint')}
    >
      <Row
        label={t('account.export.label')}
        sub={
          requested
            ? <span>{t('account.export.requestedSub', { time: formatTime(requestedAt, { hour: '2-digit', minute: '2-digit' }) })}</span>
            : <span>{t('account.export.idleSub')}</span>
        }
      >
        <Button
          leading={requested ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          onClick={() => { setRequested(true); }}
          disabled={requested}
        >
          {requested ? t('account.export.preparing') : t('account.export.request')}
        </Button>
      </Row>
    </Section>
  );
}
