// Pure turn-by-turn guidance logic, extracted out of DriverMap.js so it can be
// unit-tested with synthetic GPS ticks (no browser/Google Maps needed).
//
// ARCHITECTURE NOTE (researched against how Google's own Navigation SDK and
// comparable turn-by-turn systems — Mapbox Navigation SDK, OsmAnd — handle
// this): production nav systems track progress as distance-remaining-to-the-
// next-maneuver derived from map-matched progress along the route polyline,
// which is monotonically decreasing, and fire each announcement tier via a
// CROSSING check (previous-remaining > threshold >= current-remaining) so a
// sparse GPS tick can never step over a threshold band undetected — it only
// ever changes how far the crossing happened past the line, never whether it
// was seen. This file doesn't have a route polyline available (normalizeStep
// only keeps each step's start point, see src/app/api/google/directions/
// route.js), so it can't do full map-matching, but it applies the same
// crossing-detection principle to the straight-line distance-to-next-turn,
// which is what actually closes the sparse-GPS gap (BUG 3 below) instead of
// only patching one symptom of it.
//
// THREE bugs fixed here (all reported/found and reproduced with real numbers
// or a recorded real Google Directions response before being fixed):
//
// BUG 1 — pass-check and "turn now" voice check overlapped, and pass-check
// ran FIRST in the same tick. The old code used almost the same distance for
// "have we passed this turn" (45m) and "say turn now" (30m). A single sparse
// GPS update (phone GPS does not tick at a fixed rate) could land inside 45m
// of the turn, immediately advancing past it before the "turn now" cue ever
// had a chance to fire. Two short, opposite-direction turns close together
// made it worse: a `while` loop could hop over more than one short step in a
// single GPS tick.
//   Fix: STEP_PASSED_M (20m) is clearly SMALLER than VOICE_FINAL_M (35m),
//   with real margin. Step advancement is capped to ONE step per call.
//
// BUG 2 — instruction text and distance countdown described DIFFERENT turns.
// A Directions step's `instruction` and `location` describe the SAME
// maneuver (confirmed against a real recorded API response — e.g. step N's
// instruction "Head east on 5 Ave SW" pairs with step N's own location, the
// point where you start doing that). The OLD code displayed/spoke
// `steps[idx].instruction` (the turn already made) while measuring distance
// to `steps[idx+1].location` (the NEXT, upcoming turn) — i.e. it announced
// the wrong turn's name paired with the right turn's distance. This directly
// explains "it speaks the previous turn" independent of the timing bug above.
//   Fix: once the driver is on step `idx` (already executed that maneuver),
//   the banner/voice must describe the UPCOMING maneuver — `steps[idx+1]` —
//   not `steps[idx]`. The very last step (arrival, no nextStep) is unaffected
//   — it already described itself correctly.
//
// Third improvement, not a bug fix but requested alongside these:
//   Short-step awareness: when the UPCOMING step is short (< 80m — e.g. a
//   quick turn-then-turn), the early/main voice distances shrink
//   proportionally so the app doesn't try to say "in 500 metres" on a
//   60-metre street, and the cue has time to finish before the pass-check
//   can trigger.
//
// BUG 3 — sparse GPS ticks could skip the "final" voice window entirely.
// Found by an expanded synthetic test sweep across driving speed x GPS-gap
// combinations (not from a driver report) — real phone GPS ticks are not
// evenly spaced, and at highway speed with a multi-second gap between fixes,
// one tick can be >35m out (nothing due yet) and the very next tick can
// already be inside STEP_PASSED_M (20m) — i.e. the 20-35m band where "final"
// fires was never sampled by an isolated per-tick threshold check.
//   Fix: voice stages now fire on CROSSING, not on isolated-sample threshold
//   membership. Each call receives the previous tick's distance-to-turn
//   (prevDistToTurn); a stage fires if prevDist was above its threshold and
//   the current distance is at or below it — regardless of how big the drop
//   was. This is the same principle production nav systems use (see
//   ARCHITECTURE NOTE above), applied to the distance quantity this codebase
//   actually has available. The very first call for a step (no valid
//   prevDistToTurn yet) falls back to plain threshold membership so the
//   initial banner/voice on step load still fires immediately.
//   A second, narrower case remains even with crossing-detection: straight-
//   line distance-to-turn is only monotonic while approaching — a sparse
//   enough tick can land once BEFORE the turn and once AFTER it, with both
//   samples outside the "final" band, because the true closest approach
//   (distance ~0) happened between the two samples, not at either one. This
//   is handled by an explicit overshoot check: if the driver was closing in
//   on this turn (within "main" range) and distance has now started
//   INCREASING again, that is geometric proof the turn was just passed, so
//   "final" fires and the step advances even though no sample was ever
//   inside STEP_PASSED_M or VOICE_FINAL_M.

export const STEP_PASSED_M   = 20   // "we have physically passed this turn"
export const VOICE_FINAL_M   = 35   // "turn right now" — must fire BEFORE STEP_PASSED_M can trigger
export const VOICE_MAIN_M    = 150  // "turn right"
export const VOICE_EARLY_M   = 500  // "in 500 metres, turn right"
export const THEN_CUE_M      = 150  // secondary "then" icon
export const BANNER_HIDE_URBAN_M   = 500
export const BANNER_HIDE_HIGHWAY_M = 2000
// Below this step length (metres) a step is "short" — two turns close
// together. Early/main voice distances shrink so they fit inside it and
// finish speaking before the driver reaches the next turn.
export const SHORT_STEP_M    = 80

// ── Speed-scaled voice thresholds ───────────────────────────────────────────
// Fixed-distance thresholds (VOICE_EARLY_M etc. above) give wildly different
// REACTION TIME depending on speed: 500m is ~16s of warning at 110km/h (too
// late to safely change lanes for a highway exit) but ~60s at 30km/h (reads
// as premature in the city). Real nav systems trigger primarily off ETA to
// the maneuver so the driver gets roughly the same reaction time regardless
// of speed — see target-seconds constants below. Distance is still what
// nextVoiceStage() actually compares (its crossing-detection/overshoot logic
// is speed-agnostic and unchanged by this), so speed is converted to an
// equivalent distance threshold once per tick via speedScaledThresholds().
export const VOICE_EARLY_TARGET_S = 22   // ~20-25s lead time
export const VOICE_MAIN_TARGET_S  = 9    // ~8-10s lead time
export const VOICE_FINAL_TARGET_S = 3.5  // ~3-4s lead time

// Clamp bounds (metres) so the speed-derived distance never collapses too
// small at low speed (stop-and-go city driving) or runs away too large at
// high speed (a GPS speed spike shouldn't push "early" out to 2km). Floors
// sit at-or-near the legacy fixed values so slow/city driving doesn't
// regress relative to today's behaviour.
export const VOICE_EARLY_MIN_M = 200,  VOICE_EARLY_MAX_M = 900
export const VOICE_MAIN_MIN_M  = 60,   VOICE_MAIN_MAX_M  = 300
export const VOICE_FINAL_MIN_M = 30,   VOICE_FINAL_MAX_M = 80

// New long-range highway advisory — a single-shot heads-up ahead of the
// early/main/final ladder, not speed-scaled (the point is "a highway
// maneuver is coming up," not a speed-proportional countdown). Only
// considered on steps long enough to be a genuine highway approach — see
// the announceStep.distance gate in computeTurnGuidance below.
export const VOICE_FAR_OUT_M = 2000

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function haversineM(a, b) {
  const R    = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s    = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * Scale a set of early/main/final voice thresholds down when the step itself
 * is short, so a 60m street between two turns doesn't try to announce "in
 * 500 metres" (which wouldn't finish before the turn anyway) and so the
 * main/final cues have clear separation from the pass-check within that
 * short distance. Never scales below `base.final` + a small margin, so
 * final can still fire. Takes the base thresholds as input (rather than
 * reading the fixed constants directly) so it applies equally whether the
 * base came from the legacy fixed values or from speed-scaling below.
 */
function scaledVoiceThresholds(stepDistanceM, base = { early: VOICE_EARLY_M, main: VOICE_MAIN_M, final: VOICE_FINAL_M }) {
  if (stepDistanceM == null || stepDistanceM >= SHORT_STEP_M) {
    return base
  }
  // Fit early/main inside the step length, leaving final untouched (it's
  // already small) and never letting main collapse into final.
  const main  = Math.max(base.final + 15, Math.min(base.main, stepDistanceM * 0.7))
  const early = Math.max(main + 10, Math.min(base.early, stepDistanceM * 1.5))
  return { early, main, final: base.final }
}

/**
 * Derive early/main/final distance thresholds from current driving speed so
 * announcements give roughly the same REACTION TIME regardless of speed
 * (see module-header comment above the target-seconds constants). Falls
 * back to the legacy fixed thresholds when speed is unknown/zero (e.g. the
 * leg-load seed call, or a driver stopped/just starting to move) — this is
 * what keeps every pre-existing caller (no speedMps passed) byte-identical
 * to today's behaviour. Short-step shrinking is then applied on top via
 * scaledVoiceThresholds, same as the legacy path.
 */
function speedScaledThresholds(speedMps, stepDistanceM) {
  const base = !speedMps || speedMps <= 0
    ? { early: VOICE_EARLY_M, main: VOICE_MAIN_M, final: VOICE_FINAL_M }
    : {
      early: clamp(speedMps * VOICE_EARLY_TARGET_S, VOICE_EARLY_MIN_M, VOICE_EARLY_MAX_M),
      main:  clamp(speedMps * VOICE_MAIN_TARGET_S,  VOICE_MAIN_MIN_M,  VOICE_MAIN_MAX_M),
      final: clamp(speedMps * VOICE_FINAL_TARGET_S, VOICE_FINAL_MIN_M, VOICE_FINAL_MAX_M),
    }
  return scaledVoiceThresholds(stepDistanceM, base)
}

// Stage ranks, in firing-priority order (checked final-first so a big
// single-tick drop resolves to the most-advanced stage instead of silently
// passing through earlier ones). 0 = nothing spoken yet for this step.
// farOut (rank 1) is the new long-range highway advisory; early/main/final
// keep their prior relative order, just shifted up one rank.
const STAGE_RANK = { farOut: 1, early: 2, main: 3, final: 4 }

/**
 * Decide which voice stage (if any) fires this tick via crossing-detection:
 * a stage fires once prevDist is strictly above its threshold and curDist
 * has reached or gone below it, checked highest-priority (final) first so a
 * big single-tick drop still resolves to the correct stage instead of
 * silently passing through it. Falls back to plain membership when there's
 * no previous distance to compare against (first sample for this step).
 * farOut is NOT checked here — it has its own crossing check in
 * computeTurnGuidance because, unlike early/main/final, it must survive
 * across a step-index advance (see the REAL-API FINDING comment there).
 */
function nextVoiceStage(prevDist, curDist, thresholds, currentStage) {
  const { early, main, final } = thresholds
  const crossed = (t) => (prevDist == null ? curDist <= t : prevDist > t && curDist <= t)

  if (currentStage < STAGE_RANK.final && crossed(final)) return { stage: STAGE_RANK.final, label: 'final' }
  if (currentStage < STAGE_RANK.main  && crossed(main))  return { stage: STAGE_RANK.main,  label: 'main' }
  if (currentStage < STAGE_RANK.early && crossed(early)) return { stage: STAGE_RANK.early, label: 'early' }
  return null
}

/**
 * Pure decision function — one GPS tick in, full guidance state out.
 *
 * @param {object} params
 * @param {Array}  params.steps              Normalized Directions steps
 * @param {number} params.currentIdx         Current step index (from last call)
 * @param {number} params.lng
 * @param {number} params.lat
 * @param {number} params.lastSpokenStepIdx   Step index the voice stage tracker applies to
 * @param {number} params.voiceStage         0=none,1=farOut,2=early,3=main,4=final spoken for lastSpokenStepIdx (STAGE_RANK)
 * @param {number|null} [params.prevDistToTurn=null]  Distance-to-turn measured on the PREVIOUS
 *   tick for lastSpokenStepIdx — used for crossing-detection (BUG 3 fix). Pass null on the
 *   first call or after a route reload.
 * @param {boolean} [params.liveGps=true]    false = seed call (banner only, no voice, no ref writes)
 * @param {number} [params.speedMps=0]       Smoothed driver speed (metres/second). 0/omitted
 *   falls back to the legacy fixed early/main/final thresholds — see speedScaledThresholds().
 * @param {number} [params.lastFarOutStepIdx=-1]  Index (within `steps`) of the announceStep
 *   farOut has already fired for, or -1 if not yet fired for any step. Tracked SEPARATELY from
 *   lastSpokenStepIdx/voiceStage because farOut must survive a currentIdx advance — see the
 *   REAL-API FINDING comment in the function body for why (verified against live Deerfoot
 *   Trail data: gating farOut on the same per-step reset as early/main/final made it fire
 *   immediately-on-arrival instead of getting real crossing-detection ticks toward 2000m,
 *   whenever the immediately-prior real road segment was itself shorter than 2000m).
 * @param {number|null} [params.prevDistFarOut=null]  Distance-to-turn measured on the PREVIOUS
 *   tick for farOut's crossing-detection specifically — independent of prevDistToTurn/priorDist
 *   (which reset on every step advance). Pass null on the first call or after a route reload.
 *
 * @returns {{
 *   newIdx: number,
 *   banner: {announceStep, instruction, distanceM, thenStep} | null,
 *   voiceEvent: {step, distToTurn, stage: 'farOut'|'early'|'main'|'final'} | null,
 *   newLastSpokenStepIdx: number,
 *   newVoiceStage: number,
 *   newPrevDistToTurn: number|null,
 *   newLastFarOutStepIdx: number,
 *   newPrevDistFarOut: number|null,
 * }}
 */
export function computeTurnGuidance({
  steps, currentIdx, lng, lat, lastSpokenStepIdx, voiceStage, prevDistToTurn = null, liveGps = true, speedMps = 0,
  lastFarOutStepIdx = -1, prevDistFarOut = null,
}) {
  if (!steps?.length) {
    return {
      newIdx: currentIdx, banner: null, voiceEvent: null,
      newLastSpokenStepIdx: lastSpokenStepIdx, newVoiceStage: voiceStage, newPrevDistToTurn: prevDistToTurn,
      newLastFarOutStepIdx: lastFarOutStepIdx, newPrevDistFarOut: prevDistFarOut,
    }
  }

  const idx      = currentIdx
  const step     = steps[idx]
  const nextStep = steps[idx + 1]
  if (!step) {
    return {
      newIdx: idx, banner: null, voiceEvent: null,
      newLastSpokenStepIdx: lastSpokenStepIdx, newVoiceStage: voiceStage, newPrevDistToTurn: prevDistToTurn,
      newLastFarOutStepIdx: lastFarOutStepIdx, newPrevDistFarOut: prevDistFarOut,
    }
  }

  // The step whose instruction/icon we announce is the UPCOMING maneuver —
  // nextStep, since `step` describes the turn the driver already made to get
  // onto the road they're currently driving. Only the final step (arrival,
  // no nextStep) announces itself. See BUG 2 above — a step's instruction
  // and location always describe the SAME maneuver, so announcing `step`
  // while counting down to `nextStep.location` was announcing the wrong
  // turn's name.
  const announceStep = nextStep ?? step

  // Distance to the upcoming turn point (start of next step) or last-step fallback.
  // Evaluated against the CURRENT step index — i.e. before any advance — so
  // voice-stage crossing-detection always compares apples to apples (same
  // target point) tick over tick. The index only advances once distToTurn
  // itself has already dropped under STEP_PASSED_M, at the end of this call.
  let distToTurn
  if (nextStep) {
    const [nLng, nLat] = nextStep.maneuver.location
    distToTurn = haversineM({ lng, lat }, { lng: nLng, lat: nLat })
  } else {
    const [sLng, sLat] = step.maneuver.location
    distToTurn = haversineM({ lng, lat }, { lng: sLng, lat: sLat })
  }

  // ── Banner visibility ────────────────────────────────────────────────────
  // Classify by the UPCOMING step's length (how far the current road runs
  // before that turn) — that's what determines whether the driver needs
  // highway-style early warning for the turn they're approaching.
  const isHighway  = announceStep.distance >= 1000
  const hideThresh = isHighway ? BANNER_HIDE_HIGHWAY_M : BANNER_HIDE_URBAN_M

  const banner = distToTurn > hideThresh ? null : (() => {
    const thenStep = nextStep && distToTurn <= THEN_CUE_M ? steps[idx + 2] ?? null : null
    return {
      // Full step object, not just instruction text — the caller needs
      // maneuver.type + maneuver.modifier together to pick the right arrow
      // icon (getManeuverIcon(banner.announceStep)), and passing the whole
      // object avoids a second place where "which step do I show" could
      // drift out of sync with the instruction text (BUG 2).
      announceStep,
      instruction: announceStep.maneuver?.instruction ?? '',
      distanceM:   distToTurn,
      thenStep,
    }
  })()

  if (!liveGps) {
    return {
      newIdx: idx, banner, voiceEvent: null,
      newLastSpokenStepIdx: lastSpokenStepIdx, newVoiceStage: voiceStage, newPrevDistToTurn: prevDistToTurn,
      newLastFarOutStepIdx: lastFarOutStepIdx, newPrevDistFarOut: prevDistFarOut,
    }
  }

  // ── Three-stage voice, crossing-detected, short-step-aware ───────────────
  // If the step being tracked changed since last tick (e.g. driver already
  // advanced past this exact target on a prior call, or a route reload
  // reset tracking), there's no valid previous distance to compare — treat
  // this as the first sample for the step so plain threshold membership
  // still fires immediately instead of requiring a second tick.
  const isFirstSampleForStep = idx !== lastSpokenStepIdx
  const stageBefore = isFirstSampleForStep ? 0 : voiceStage
  const priorDist    = isFirstSampleForStep ? null : prevDistToTurn

  const { early, main, final } = speedScaledThresholds(speedMps, announceStep.distance)
  // farOut only applies to genuinely long (highway-length) upcoming steps —
  // same isHighway-style gate as banner visibility above, at a farther
  // distance. A short urban step with a coincidentally-far GPS reading
  // never gets this cue, even if distToTurn happens to exceed VOICE_FAR_OUT_M.
  //
  // REAL-API FINDING: gating farOut purely on "is this the currently-tracked
  // step" (the same idx !== lastSpokenStepIdx reset early/main/final use)
  // means farOut only gets its FIRST sample once the driver has already
  // advanced onto the step immediately before announceStep — and on real
  // Google-returned routes that immediately-prior step is very often
  // SHORTER than VOICE_FAR_OUT_M itself (verified against live Deerfoot
  // Trail data: a 1392m and a 1787m real prior step both meant farOut's
  // first-ever sample already measured <2000m, so isFirstSampleForStep's
  // "first sample = plain membership, fire now" fallback fired immediately
  // instead of getting real crossing-detection ticks on the way down from
  // 2000m). Fix: track farOut's own "have we fired for this announceStep"
  // state keyed to announceStep's identity (idx+1, i.e. the step AFTER the
  // one currently being tracked for early/main/final), independently of the
  // isFirstSampleForStep reset above — so farOut keeps accumulating
  // crossing-detection samples across the step boundary instead of being
  // wiped every time idx advances. lastSpokenStepIdx/voiceStage (the
  // early/main/final tracker) are untouched by this — farOut has its own
  // small piece of state layered on top, reusing the same crossing-detection
  // helper and the same prevDistToTurn/newPrevDistToTurn plumbing (distToTurn
  // is already computed against the same announceStep target regardless of
  // which step idx currently is, so the same distance series is valid to
  // compare across the idx boundary — nothing else needs to change).
  const announceStepIdx = idx + 1 // index of announceStep within `steps` (idx itself if no nextStep, but farOut never applies to the last/arrival step anyway)
  const farOutAlreadyFired = lastFarOutStepIdx === announceStepIdx
  const farOut = (!farOutAlreadyFired && announceStep.distance >= VOICE_FAR_OUT_M) ? VOICE_FAR_OUT_M : null
  // farOut's own crossing check runs against the SAME distToTurn series as
  // early/main/final, but must NOT be reset just because idx advanced (see
  // comment above) — so it gets prevDistFarOut (tracked independently,
  // persisted regardless of step-tracking resets) rather than `priorDist`.
  // Guard: prevDistFarOut is only a valid comparison point if it was
  // measured against THIS SAME announceStepIdx — otherwise (route reload,
  // or the driver having advanced past a PRIOR farOut-eligible step onto a
  // later, unrelated one) it's stale distance-to-a-different-point data, and
  // must be treated as "no prior sample" (fall back to plain membership)
  // rather than compared directly, exactly like priorDist's isFirstSampleForStep
  // guard above but keyed to announceStepIdx instead of idx.
  const farOutTrackingSameStep = lastFarOutStepIdx === announceStepIdx || lastFarOutStepIdx === -1
  const validPrevDistFarOut = farOutTrackingSameStep ? prevDistFarOut : null
  let farOutCrossed = false
  if (farOut != null) {
    farOutCrossed = validPrevDistFarOut == null ? distToTurn <= farOut : (validPrevDistFarOut > farOut && distToTurn <= farOut)
  }

  // farOut and early/main/final are checked as two SEPARATE crossings (not
  // merged into one priority chain) because they track independent state —
  // folding a farOut crossing into `crossing` here would leak STAGE_RANK.farOut
  // into newVoiceStage, which is keyed to lastSpokenStepIdx (idx) and must
  // stay a pure early/main/final tracker. farOutCrossed already encodes "did
  // farOut's own threshold get crossed this tick" independently.
  let crossing = nextVoiceStage(priorDist, distToTurn, { early, main, final }, stageBefore)

  // OVERSHOOT FIX: straight-line distance-to-turn is only monotonically
  // decreasing while approaching — on a genuinely sparse tick, the sample
  // BEFORE the turn and the sample AFTER can both land outside the "final"
  // band even though the driver's true path passed within it (distance
  // decreases then increases again between the two samples; see file header
  // ARCHITECTURE NOTE — full route-projection would track along-route
  // distance, which doesn't have this V-shape, but this codebase only has
  // per-step endpoints to work with). Detect this geometrically instead of
  // by distance-band membership: if we were ALREADY essentially at the turn
  // (priorDist within final range + a small margin) and distance has now
  // increased by more than plausible GPS jitter, we've moved past the
  // closest point on the way through, not just jittered in place.
  // Two qualifiers, both required, to avoid misfiring on a driver stopped
  // near (but short of) a turn at a red light, whose GPS naturally wanders
  // a few metres in every direction tick to tick:
  //   1. priorDist was already inside the "final" zone + a small margin —
  //      not the much wider "main" band, so a stationary car merely
  //      approaching (not yet arrived) can't qualify at all.
  //   2. the increase itself exceeds a jitter-noise floor (10m) — ordinary
  //      GPS wander is a few metres; only a real, sustained displacement
  //      (i.e. actually still driving) produces a bigger jump than that.
  const OVERSHOOT_QUALIFY_M = final + 15
  const JITTER_FLOOR_M      = 10
  const passedWithoutCrossing =
    !crossing && priorDist != null && priorDist <= OVERSHOOT_QUALIFY_M &&
    (distToTurn - priorDist) > JITTER_FLOOR_M && stageBefore < STAGE_RANK.final
  if (passedWithoutCrossing) {
    crossing = { stage: STAGE_RANK.final, label: 'final' }
  }

  // early/main/final takes priority over farOut if both would cross on the
  // exact same tick (a big single-tick GPS jump) — the more urgent, closer
  // cue is what the driver needs to hear. farOut only surfaces as the
  // voiceEvent when nothing more urgent fired this tick.
  const firingFarOut = !crossing && farOutCrossed
  if (firingFarOut) crossing = { stage: STAGE_RANK.farOut, label: 'farOut' }

  const voiceEvent  = crossing ? { step: announceStep, distToTurn, stage: crossing.label } : null
  // newVoiceStage (the early/main/final tracker) must NOT advance when the
  // only thing that fired was farOut — farOut has its own independent state
  // below, and early/main/final still need their own untouched first crossing.
  const newVoiceStage = (crossing && !firingFarOut) ? crossing.stage : stageBefore

  // Advance AT MOST ONE step per tick — never leapfrog two short steps in
  // the same call. If the driver has genuinely passed two turns between
  // ticks (e.g. a long GPS gap), the next tick will catch the second
  // advance. Also advance on the overshoot signal above — a growing
  // distance-to-turn after a close approach means we've physically passed
  // it even if we never sampled inside STEP_PASSED_M.
  const stepPassed = distToTurn < STEP_PASSED_M || passedWithoutCrossing
  const newIdx = (idx < steps.length - 1 && stepPassed) ? idx + 1 : idx

  // farOut's own state: mark announceStepIdx as fired once it actually
  // fires (voiceEvent.stage === 'farOut'), and keep accumulating
  // prevDistFarOut every live tick regardless of step advances — this is
  // exactly what lets it survive the idx boundary (see REAL-API FINDING
  // comment above). Reset to "not fired yet" only once the driver moves on
  // to a genuinely different announceStep (tracked implicitly: farOut is
  // simply never checked again once farOutAlreadyFired is true for that
  // step, and a NEW announceStep after advancing gets a fresh comparison
  // against lastFarOutStepIdx next call).
  const newLastFarOutStepIdx = firingFarOut ? announceStepIdx : lastFarOutStepIdx
  const newPrevDistFarOut = farOut != null ? distToTurn : prevDistFarOut

  return {
    newIdx,
    banner,
    voiceEvent,
    newLastSpokenStepIdx: idx,
    newVoiceStage: newIdx === idx ? newVoiceStage : 0,
    newPrevDistToTurn: newIdx === idx ? distToTurn : null,
    newLastFarOutStepIdx,
    newPrevDistFarOut,
  }
}
