import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

function parse(path) {
  return ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
}

function findPhaseLabels(node) {
  if (ts.isElementAccessExpression(node) && ts.isObjectLiteralExpression(node.expression)
    && node.argumentExpression.getText().replace(/\s/g, '') === 'plan.execution.phase') return node.expression;
  return ts.forEachChild(node, findPhaseLabels);
}

test('设置页的执行阶段标签覆盖 ExecutionPhase 的全部取值', () => {
  const contract = parse('../../src/contracts/behavior.ts');
  const executionPhase = contract.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === 'ExecutionPhase');
  assert.ok(executionPhase && ts.isUnionTypeNode(executionPhase.type));
  const phases = executionPhase.type.types.map(node => {
    assert.ok(ts.isLiteralTypeNode(node) && ts.isStringLiteralLike(node.literal));
    return node.literal.text;
  });

  const labels = findPhaseLabels(parse('../../src/console/client.js'));
  assert.ok(labels);
  const keys = labels.properties.map(node => {
    assert.ok(ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)));
    return node.name.text;
  });
  assert.deepEqual(keys.sort(), phases.sort());
});
