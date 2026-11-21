"""Exercise the Python provider with synthetic fact attribution."""
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / "vendor/mnemosyne/service/src"), str(ROOT / "src/memory")]
from provider import MemoryPort
from cognitive_memory.bootstrap import build_context


class FactAttribution(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory())
        ctx = build_context(data_dir=directory, token="synthetic")
        self.addCleanup(ctx.db.close)
        self.addCleanup(ctx.runtime.stop)
        self.port = MemoryPort(ctx.service, companion_id="test", scope_id="owner", workspace_id="world")

    def test_interaction_source(self):
        accepted = [(domain, domain, actor, True)
                    for domain in ("body", "economy")
                    for actor in ("owner", "companion", "system")]
        rejected = [("garden", "garden", "owner", False),
                    ("body", "economy", "owner", False),
                    ("economy", "economy", "unknown", False)]
        for i, (domain, prefix, actor, recognized) in enumerate(accepted + rejected):
            with self.subTest(domain=domain, prefix=prefix, actor=actor):
                source_id = f"native-fact:{i}"
                self.port.observe(
                    self.port.scope, source_id=source_id, source_kind="system", revision="1",
                    content=f"Synthetic fact {i}", actor_id="owner",
                    attribution={"domain": domain, "factId": f"{prefix}:{i}", "kind": actor},
                )
                metadata = self.port.source(source_id)["metadata"]
                self.assertEqual(metadata.get("pet_interaction", False), recognized)


if __name__ == "__main__":
    unittest.main()
