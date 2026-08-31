import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  testId: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 pr-11 text-sm text-[#183c44] outline-none focus:border-[#183c44]"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#476269] hover:text-[#183c44]"
        data-testid={`${testId}-toggle-visibility`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
