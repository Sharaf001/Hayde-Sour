import { useState } from 'react';

export type ImageInputValue = { file: File | null; url: string };

export function ImageInput({
  value,
  onChange,
  label,
  testIdPrefix,
}: {
  value: ImageInputValue;
  onChange: (value: ImageInputValue) => void;
  label?: string;
  testIdPrefix: string;
}) {
  const [mode, setMode] = useState<'file' | 'url'>(value.url ? 'url' : 'file');

  return (
    <div>
      {label && <p className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{label}</p>}
      <div className="flex gap-2 text-[10px] font-bold uppercase tracking-[.08em]">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`rounded-full px-3 py-1 ${mode === 'file' ? 'bg-[#183c44] text-[#f9f0df]' : 'border border-[#cfc0aa] text-[#476269]'}`}
          data-testid={`${testIdPrefix}-mode-file`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`rounded-full px-3 py-1 ${mode === 'url' ? 'bg-[#183c44] text-[#f9f0df]' : 'border border-[#cfc0aa] text-[#476269]'}`}
          data-testid={`${testIdPrefix}-mode-url`}
        >
          Paste URL
        </button>
      </div>
      {mode === 'file' ? (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange({ file: e.target.files?.[0] || null, url: '' })}
          className="mt-2 text-sm"
          data-testid={`${testIdPrefix}-file`}
        />
      ) : (
        <input
          type="url"
          placeholder="https://example.com/photo.jpg"
          value={value.url}
          onChange={(e) => onChange({ file: null, url: e.target.value })}
          className="mt-2 w-full rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm"
          data-testid={`${testIdPrefix}-url`}
        />
      )}
    </div>
  );
}
