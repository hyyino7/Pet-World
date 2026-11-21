const reportEdgeKey = ({ from, to }) => from + ' → ' + to;

export function summarizeRules({ rules, edges }) {
  return ['R1', 'R2', 'R3', 'R4'].map(rule => {
    const entries = rules.filter(entry => entry.rule === rule);
    return {
      rule,
      entries,
      callSites: new Set(entries.map(({ file, line, column }) => JSON.stringify([file, line, column]))).size,
      violationEdges: new Set(entries.filter(({ from, to }) => from && to).map(reportEdgeKey)).size,
      dependencyEdges: new Set(edges.filter(edge => edge.rule === rule).map(reportEdgeKey)).size,
    };
  });
}

function judgmentCounts(rows) {
  return { points: rows.length, files: new Set(rows.map(row => row.file)).size };
}

function judgmentScopeCounts(rows) {
  return {
    runtime: judgmentCounts(rows.filter(row => row.file.startsWith('src/'))),
    scanned: judgmentCounts(rows),
  };
}

export function summarizeJudgments(rows) {
  return {
    kind: judgmentScopeCounts(rows.filter(row => row.target === 'kind')),
    action: judgmentScopeCounts(rows.filter(row => row.target === 'action')),
    total: judgmentScopeCounts(rows),
  };
}
