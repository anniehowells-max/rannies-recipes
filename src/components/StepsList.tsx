type Props = {
  steps: string[]
  onChange: (steps: string[]) => void
}

export default function StepsList({ steps, onChange }: Props) {
  function update(i: number, val: string) {
    const updated = [...steps]
    updated[i] = val
    onChange(updated)
  }

  function remove(i: number) {
    onChange(steps.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <span className="font-ui text-[10px] tracking-widest text-stone-300 font-semibold mt-3.5 w-5 flex-shrink-0 text-right">
            {String(i + 1).padStart(2, '0')}
          </span>
          <textarea
            value={step}
            onChange={e => update(i, e.target.value)}
            rows={2}
            placeholder={`step ${i + 1}...`}
            className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-stone-900 transition-colors text-base resize-none"
          />
          {steps.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-stone-200 hover:text-red-400 transition-colors mt-2.5 text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...steps, ''])}
        className="text-sm text-stone-400 hover:text-stone-700 transition-colors text-left pl-8"
      >
        + add step
      </button>
    </div>
  )
}
