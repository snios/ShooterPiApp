// --- Typer som matchar din UI ---
export type Segment = { start: number; end: number; on: boolean };
export type OutputConfig = {
  id: number;
  label: string;
  enabled: boolean;
  segments: Segment[];
};
export type RoutineDraft = {
  name: string;
  totalDuration: number;
  outputs: OutputConfig[];
};

// --- Firmware-typer ---
export type FirmwareAction = { action?: 0 | 1; delay?: number }; // ms för delay
export type FirmwarePinConfig = { pin: number; actions: FirmwareAction[] };
export type FirmwarePayload = {
  id: number;
  name: string;
  pinConfigurations: FirmwarePinConfig[];
};

// Hjälpare: täcker segmenten hela totalen?
export function segmentsCoverTotal(total: number, segs: Segment[]) {
  if (total <= 0) return false;
  const sorted = [...segs].sort((a, b) => a.start - b.start);
  let t = 0;
  for (const s of sorted) {
    if (Math.abs(s.start - t) > 1e-6 || s.end <= s.start) return false;
    t = s.end;
  }
  return Math.abs(t - total) < 1e-6;
}

// Sekunder → millisekunder (avrundat)
const sToMs = (s: number) => Math.max(0, Math.round(s * 1000));

/**
 * Konvertera UI-segment till firmware-actions:
 *  - startnivå (action)
 *  - delay (ms) för segmentets längd
 *  - action vid nivåbyte
 *  - **NYTT:** om sista segmentet är ON → lägg på ett OFF (action:0) direkt efter
 */
export function segmentsToActions(segments: Segment[]): FirmwareAction[] {
  if (!segments?.length) return [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  const actions: FirmwareAction[] = [];
  // startnivå
  actions.push({ action: sorted[0].on ? 1 : 0 });

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    const durMs = sToMs(seg.end - seg.start);
    if (durMs > 0) actions.push({ delay: durMs });

    const next = sorted[i + 1];
    if (next && next.on !== seg.on) {
      actions.push({ action: next.on ? 1 : 0 });
    }
  }

  // Säkerställ att sista läget slutar i OFF om sista seg var ON
  const lastSeg = sorted[sorted.length - 1];
  if (lastSeg.on) {
    const last = actions[actions.length - 1];
    const lastIsAlreadyOff =
      typeof last?.action === "number" && last.action === 0;
    if (!lastIsAlreadyOff) actions.push({ action: 0 });
  }

  return actions;
}

/** Bygg payload som din ESP8266 förväntar sig */
export function buildFirmwarePayload(draft: RoutineDraft): FirmwarePayload {
  const pinConfigurations: FirmwarePinConfig[] = draft.outputs
    .filter((o) => o.enabled)
    .map((o) => ({
      pin: o.id, // 1–4 → mappas i firmwaren till D1–D4
      actions: segmentsToActions(o.segments),
    }));

  return {
    id: 0, // 0 ⇒ låt firmwaren ge nästa lediga ID
    name: draft.name || "unnamed",
    pinConfigurations,
  };
}

/** Enkel validering för UI:t */
export function validateDraft(draft: RoutineDraft): string[] {
  const errs: string[] = [];
  if (!draft.name?.trim()) errs.push("Namn saknas.");
  if (!(draft.totalDuration > 0)) errs.push("TotalDuration måste vara > 0.");
  draft.outputs
    .filter((o) => o.enabled)
    .forEach((o) => {
      if (!segmentsCoverTotal(draft.totalDuration, o.segments)) {
        errs.push(
          `Utgång ${o.id}: segment täcker inte ${draft.totalDuration}s.`
        );
      }
    });
  return errs;
}
