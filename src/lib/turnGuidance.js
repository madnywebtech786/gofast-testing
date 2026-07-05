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
 * Scale the early/main voice thresholds down when the step itself is short,
 * so a 60m street between two turns doesn't try to announce "in 500 metres"
 * (which wouldn't finish before the turn anyway) and so the main/final cues
 * have clear separation from the pass-check within that short distance.
 * Never scales below STEP_PASSED_M + a small margin, so final can still fire.
 */
function scaledVoiceThresholds(stepDistanceM) {
  if (stepDistanceM == null || stepDistanceM >= SHORT_STEP_M) {
    return { early: VOICE_EARLY_M, main: VOICE_MAIN_M, final: VOICE_FINAL_M }
  }
  // Fit early/main inside the step length, leaving final untouched (it's
  // already small) and never letting main collapse into final.
  const main  = Math.max(VOICE_FINAL_M + 15, Math.min(VOICE_MAIN_M, stepDistanceM * 0.7))
  const early = Math.max(main + 10, Math.min(VOICE_EARLY_M, stepDistanceM * 1.5))
  return { early, main, final: VOICE_FINAL_M }
}

/**
 * Decide which voice stage (if any) fires this tick via crossing-detection:
 * a stage fires once prevDist is strictly above its threshold and curDist
 * has reached or gone below it, checked highest-priority (final) first so a
 * big single-tick drop still resolves to the correct stage instead of
 * silently passing through it. Falls back to plain membership when there's
 * no previous distance to compare against (first sample for this step).
 */
function nextVoiceStage(prevDist, curDist, thresholds, currentStage) {
  const { early, main, final } = thresholds
  const crossed = (t) => (prevDist == null ? curDist <= t : prevDist > t && curDist <= t)

  if (currentStage < 3 && crossed(final)) return { stage: 3, label: 'final' }
  if (currentStage < 2 && crossed(main))  return { stage: 2, label: 'main' }
  if (currentStage < 1 && crossed(early)) return { stage: 1, label: 'early' }
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
 * @param {number} params.voiceStage         0=none,1=early,2=main,3=final spoken for lastSpokenStepIdx
 * @param {number|null} [params.prevDistToTurn=null]  Distance-to-turn measured on the PREVIOUS
 *   tick for lastSpokenStepIdx — used for crossing-detection (BUG 3 fix). Pass null on the
 *   first call or after a route reload.
 * @param {boolean} [params.liveGps=true]    false = seed call (banner only, no voice, no ref writes)
 *
 * @returns {{
 *   newIdx: number,
 *   banner: {announceStep, instruction, distanceM, thenStep} | null,
 *   voiceEvent: {step, distToTurn, stage: 'early'|'main'|'final'} | null,
 *   newLastSpokenStepIdx: number,
 *   newVoiceStage: number,
 *   newPrevDistToTurn: number|null,
 * }}
 */
export function computeTurnGuidance({
  steps, currentIdx, lng, lat, lastSpokenStepIdx, voiceStage, prevDistToTurn = null, liveGps = true,
}) {
  if (!steps?.length) {
    return {
      newIdx: currentIdx, banner: null, voiceEvent: null,
      newLastSpokenStepIdx: lastSpokenStepIdx, newVoiceStage: voiceStage, newPrevDistToTurn: prevDistToTurn,
    }
  }

  const idx      = currentIdx
  const step     = steps[idx]
  const nextStep = steps[idx + 1]
  if (!step) {
    return {
      newIdx: idx, banner: null, voiceEvent: null,
      newLastSpokenStepIdx: lastSpokenStepIdx, newVoiceStage: voiceStage, newPrevDistToTurn: prevDistToTurn,
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

  const { early, main, final } = scaledVoiceThresholds(announceStep.distance)
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
    (distToTurn - priorDist) > JITTER_FLOOR_M && stageBefore < 3
  if (passedWithoutCrossing) {
    crossing = { stage: 3, label: 'final' }
  }

  const voiceEvent  = crossing ? { step: announceStep, distToTurn, stage: crossing.label } : null
  const newVoiceStage = crossing ? crossing.stage : stageBefore

  // Advance AT MOST ONE step per tick — never leapfrog two short steps in
  // the same call. If the driver has genuinely passed two turns between
  // ticks (e.g. a long GPS gap), the next tick will catch the second
  // advance. Also advance on the overshoot signal above — a growing
  // distance-to-turn after a close approach means we've physically passed
  // it even if we never sampled inside STEP_PASSED_M.
  const stepPassed = distToTurn < STEP_PASSED_M || passedWithoutCrossing
  const newIdx = (idx < steps.length - 1 && stepPassed) ? idx + 1 : idx

  return {
    newIdx,
    banner,
    voiceEvent,
    newLastSpokenStepIdx: idx,
    newVoiceStage: newIdx === idx ? newVoiceStage : 0,
    newPrevDistToTurn: newIdx === idx ? distToTurn : null,
  }
}
