import { ageLine, statusRoles, statusSignals } from './statusRail.mjs';

export default function StatusRail() {
  return (
    <aside
      aria-label="Current status"
      className="min-w-0 border-t border-black/[0.07] pt-8 xl:sticky xl:top-8 xl:flex xl:h-[calc(100vh-4rem)] xl:min-h-[680px] xl:max-h-[900px] xl:flex-col xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0 2xl:pl-10"
    >
      <p className="text-[clamp(1.65rem,2.1vw,2.25rem)] leading-none tracking-[-0.055em] text-neutral-950">
        {ageLine}
      </p>

      <ol className="mt-10 space-y-7 2xl:mt-12 2xl:space-y-8">
        {statusRoles.map((role) => (
          <li key={role.index}>
            <h2 className="text-[14px] font-semibold leading-[1.2] tracking-[-0.025em] text-neutral-950 2xl:text-[15px]">
              <span className="mr-2">[{role.index}]</span>
              {role.title}
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-[1.45] text-neutral-600 2xl:text-xs">
              {role.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-11 grid grid-cols-2 gap-8 xl:grid-cols-1 xl:gap-7 2xl:mt-14 2xl:gap-9">
        {statusSignals.map((signal) => (
          <div key={signal.value}>
            <p className="text-[clamp(2.35rem,3.2vw,3.25rem)] font-semibold leading-[0.88] tracking-[-0.07em] text-neutral-950">
              {signal.value}
            </p>
            <p className="mt-2 max-w-[24ch] text-[11px] leading-snug text-neutral-500 2xl:text-xs">
              {signal.copy}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-between gap-4 text-[10px] text-neutral-500 xl:mt-auto">
        <span>Los Angeles, CA</span>
        <span>© 2026</span>
      </div>
    </aside>
  );
}
