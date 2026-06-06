export function Field({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const labelTone = isDark ? 'text-white/40' : 'text-black/45';
  return (
    <div>
      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${labelTone}`}>{label}</div>
      {children}
    </div>
  );
}

export function BudgetField({
  label, value, onChange, inputBg, labelTone,
}: {
  label: string; value: number; onChange: (v: number) => void;
  inputBg: string; labelTone: string;
}) {
  return (
    <label className="block">
      <div className={`text-[9px] font-bold uppercase tracking-[0.18em] mb-1 ${labelTone}`}>{label}</div>
      <input
        type="number" step={0.5}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value) || 0); }}
        className={`w-full px-2 py-1 rounded-md border outline-none text-[12px] font-mono tabular-nums ${inputBg}`}
      />
    </label>
  );
}
