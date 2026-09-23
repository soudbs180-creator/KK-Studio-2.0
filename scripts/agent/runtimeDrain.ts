/** Synchronous gate: once shutdown succeeds, no new authenticated work starts. */
export function createRuntimeDrain(isBusy: () => boolean) {
  let draining = false;
  let active = 0;
  return {
    enter(mutating = true) {
      if (draining) return null;
      if (mutating) active += 1;
      let released = false;
      return () => {
        if (!released && mutating) active -= 1;
        released = true;
      };
    },
    shutdown() {
      if (active || isBusy()) return false;
      draining = true;
      return true;
    },
  };
}
