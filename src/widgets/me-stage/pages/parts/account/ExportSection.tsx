import { useMemo, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Section, Row, Button } from '@shared/ui/forms';
import { formatTime } from '@shared/i18n';

export function ExportSection() {
  const [requested, setRequested] = useState(false);
  const requestedAt = useMemo(() => new Date(), []);
  return (
    <Section
      title="Export your data"
      hint="GDPR-compatible export. Includes profile, comments, reviews, AI tokens used, and audit history."
    >
      <Row
        label="Data export"
        sub={
          requested
            ? <span>Requested at {formatTime(requestedAt, { hour: '2-digit', minute: '2-digit' })}. Average prep time is ~10 minutes; we&apos;ll email you when it&apos;s ready.</span>
            : <span>Generates a zip file (JSON + CSV) with everything we have on file for your account.</span>
        }
      >
        <Button
          leading={requested ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          onClick={() => { setRequested(true); }}
          disabled={requested}
        >
          {requested ? 'Preparing export' : 'Request export'}
        </Button>
      </Row>
    </Section>
  );
}
