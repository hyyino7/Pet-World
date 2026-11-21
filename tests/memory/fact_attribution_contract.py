"""Verify both directions of the fact-attribution contract with synthetic inputs."""
import ast
import json
import sys
from pathlib import Path
from unittest import TestCase, main

ROOT = Path(__file__).resolve().parents[2]
PROVIDER = ROOT / "src/memory/provider.py"
sys.path[:0] = [str(ROOT / "vendor/mnemosyne/service/src"), str(PROVIDER.parent)]
from provider import MemoryPort


def allowed_values(predicate, expression):
    field = ast.dump(ast.parse(expression, mode="eval").body)
    [comparison] = [
        node for node in ast.walk(predicate)
        if isinstance(node, ast.Compare)
        and len(node.ops) == 1 and isinstance(node.ops[0], ast.In)
        and ast.dump(node.left) == field
    ]
    [values] = comparison.comparators
    if not isinstance(values, ast.Tuple):
        raise AssertionError(f"Expected a tuple of allowed values for {expression}")
    return set(ast.literal_eval(values))


def recognize(domain, actor):
    return MemoryPort.interaction_source(
        "native-fact:synthetic", "system",
        {"attribution": {"domain": domain, "factId": f"{domain}:synthetic", "kind": actor}},
    )


class FactAttributionContract(TestCase):
    def test_python_tuples_match_typescript(self):
        tree = ast.parse(PROVIDER.read_text(encoding="utf-8"))
        port = next(node for node in tree.body
                    if isinstance(node, ast.ClassDef) and node.name == "MemoryPort")
        predicate = next(node for node in port.body
                         if isinstance(node, ast.FunctionDef) and node.name == "interaction_source")
        self.assertSetEqual(allowed_values(predicate, "domain"), set(DECLARATIONS["domains"]))
        self.assertSetEqual(allowed_values(predicate, "attribution.get('kind')"), set(DECLARATIONS["actors"]))

    def test_python_accepts_declared_pairs_and_rejects_unknown_domain(self):
        for actor in DECLARATIONS["actors"]:
            for domain in DECLARATIONS["domains"]:
                with self.subTest(domain=domain, actor=actor):
                    self.assertTrue(recognize(domain, actor))
            with self.subTest(actor=actor):
                self.assertFalse(recognize("unregistered-fact-domain", actor))


if __name__ == "__main__":
    DECLARATIONS = json.load(sys.stdin)
    main()
