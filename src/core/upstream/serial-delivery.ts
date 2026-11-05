// Adapted from Alterssss/dsh-bili-whale lib/session-delivery.js, 8b0009f8ce2ebdc421afcb2e727b19ac18912ec6.
// Copyright (c) 2026 ALTERSSSS. MIT; see THIRD_PARTY_NOTICES.md.
/** One tail owns delivery across channels; a failed job cannot poison later jobs. */
export function createSerialDelivery() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    send<T>(job: () => Promise<T>): Promise<T> {
      const pending = tail.then(job);
      tail = pending.catch(() => {});
      return pending;
    },
    async idle(): Promise<void> { await tail; },
  };
}
