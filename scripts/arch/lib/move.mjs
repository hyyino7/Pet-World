import {posix} from 'node:path';
import {normalize, readJson, ts, unwrap} from './ast.mjs';
import {identity} from './ratchet.mjs';
import {resolveImport} from './rules.mjs';

function isRepositoryPath(path) {
  return typeof path === 'string' && path.length > 0 &&
    !path.includes('\\') && !path.endsWith('/') && !posix.isAbsolute(path) &&
    path === posix.normalize(path) && path !== '.' && path !== '..' && !path.startsWith('../');
}

export function baselineMove(file) {
  const mapping = readJson(file);
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw Error('--move 对照文件必须是 JSON 对象（旧路径 → 新路径）');
  }
  const paths = new Map(Object.entries(mapping));
  if ([...paths].some(pair => !pair.every(isRepositoryPath)) || new Set(paths.values()).size !== paths.size) {
    throw Error('--move 对照必须使用一一对应的仓库相对文件路径');
  }
  const importTargets = new Map();
  for (const [from, to] of paths) {
    if (from.endsWith('.ts') && to.endsWith('.ts')) {
      // TypeScript 源码搬家时，R1 记录的是 import 里的 .js 路径。
      const oldJs = from.slice(0, -3) + '.js', newJs = to.slice(0, -3) + '.js';
      importTargets.set(oldJs, newJs);
      if (from.startsWith('src/') && to.startsWith('src/')) {
        importTargets.set('dist/' + oldJs, 'dist/' + newJs);
      }
    }
  }
  return (saved, scanned) => rewriteBaseline(saved, scanned, paths, importTargets);
}

function relativeImportShape({file, target, expression}) {
  if (target === '?') return;
  const parse = text => ts.createSourceFile(file + '.ts', text, ts.ScriptTarget.Latest, true);
  const [statement] = parse(expression).statements;
  if (!statement) return;

  let node = statement, specifier;
  if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
    specifier = statement.moduleSpecifier;
  } else if (ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference)) {
    specifier = statement.moduleReference.expression;
  } else if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
    node = statement.expression;
    specifier = node.arguments[0];
  } else {
    const [declaration] = parse('type Dependency = ' + expression).statements;
    if (!ts.isTypeAliasDeclaration(declaration) || !ts.isImportTypeNode(declaration.type)) return;
    node = declaration.type;
    if (ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
  }

  specifier = unwrap(specifier);
  if (!specifier || !ts.isStringLiteralLike(specifier) || !specifier.text.startsWith('.')) return;
  if (resolveImport(file, specifier.text) !== target || normalize(node) !== expression) return;
  // 只把解析到该目标的模块说明符抽出身份比对，保留其余语法。
  return normalize(node, token => token === specifier ? '' : token.text);
}

function rewriteBaseline(saved, scanned, paths, importTargets) {
  const moveFile = file => paths.get(file) ?? file;
  const imports = new Map();
  for (const item of scanned) {
    if (item.rule !== 'R1') continue;
    const shape = relativeImportShape(item);
    if (shape === undefined) continue;
    const key = identity({...item, expression: shape});
    if (!imports.has(key)) imports.set(key, []);
    imports.get(key).push(item.expression);
  }

  return saved.map(item => {
    const moved = {...item, file: moveFile(item.file)};
    if (item.other) moved.other = {...item.other, file: moveFile(item.other.file)};
    if (item.rule === 'R1') {
      moved.target = paths.get(item.target) ?? importTargets.get(item.target) ?? item.target;
      const shape = relativeImportShape(item);
      if (shape !== undefined) {
        const key = identity({...moved, expression: shape});
        moved.expression = imports.get(key)?.pop() ?? moved.expression;
      }
    }
    return moved;
  });
}
