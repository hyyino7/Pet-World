"""Shared P2/P3 fault injection: test-owned, never an HTTP/model control."""
from unittest.mock import patch


def withdrawal_fault(kind):
    target = "cognitive_memory.tms.tombstone.cascade_memory_invalidated" if kind == "cascade" else \
        "cognitive_memory.evidence.derivation.DerivationStore.record_tombstone"
    return patch(target, side_effect=RuntimeError(f"injected {kind} failure"))


def install_file_faults(path):
    from cognitive_memory.evidence.derivation import DerivationStore
    from cognitive_memory.tms import tombstone
    from pathlib import Path
    marker = Path(path)
    original_tombstone = DerivationStore.record_tombstone
    original_cascade = tombstone.cascade_memory_invalidated

    def record(self, **kwargs):
        if marker.exists() and marker.read_text() == "tombstone":
            raise RuntimeError("injected tombstone failure")
        return original_tombstone(self, **kwargs)

    def cascade(*args, **kwargs):
        if marker.exists() and marker.read_text() == "cascade":
            raise RuntimeError("injected cascade failure")
        return original_cascade(*args, **kwargs)

    DerivationStore.record_tombstone = record
    tombstone.cascade_memory_invalidated = cascade
