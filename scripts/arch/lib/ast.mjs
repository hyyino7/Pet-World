import ts from 'typescript';
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

export {ts};
export function walk(node, visit) { visit(node); ts.forEachChild(node, child => { walk(child, visit); }); }
export function filesUnder(root) {
  return readdirSync(root, {withFileTypes:true}).flatMap(entry => {
    const path=join(root,entry.name);
    return entry.isDirectory()?filesUnder(path):/\.(?:ts|js|mjs|cjs)$/.test(path)?[path]:[];
  }).sort();
}
export const slash = path => path.replaceAll('\\','/');
export function unwrap(node) {
  while(node && (ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node))) node=node.expression;
  return node;
}
export const key = node => node && (ts.isIdentifier(node)||ts.isStringLiteralLike(node)||ts.isNumericLiteral(node))?node.text:undefined;
export function member(node) {
  node=unwrap(node);
  return ts.isPropertyAccessExpression(node)?key(node.name):ts.isElementAccessExpression(node)?key(node.argumentExpression):undefined;
}
// 用语法叶子而非正则去空白：字符串、模板正文里的空格有意义。
export function normalize(node) {
  const words=[];
  const visit=token=>{
    const children=token.getChildren();
    if(children.length){children.forEach(visit);return;}
    if(ts.isStringLiteralLike(token))words.push(JSON.stringify(token.text));
    else if([ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail].includes(token.kind))words.push(ts.SyntaxKind[token.kind]+':'+JSON.stringify(token.text));
    else words.push(token.getText());
  };
  visit(node);
  return words.join(' ');
}
export function functionPath(node) {
  const parts=[];
  for(let p=node.parent;p && !ts.isSourceFile(p);p=p.parent) {
    if(ts.isClassLike(p))parts.unshift(key(p.name)??'<class>');
    else if(ts.isFunctionLike(p)) {
      let name=key(p.name);
      if(!name && ts.isVariableDeclaration(p.parent))name=key(p.parent.name);
      if(!name && ts.isPropertyAssignment(p.parent))name=key(p.parent.name);
      if(!name && ts.isCallExpression(p.parent))name=`${normalize(p.parent.expression)}:callback${p.parent.arguments.indexOf(p)}`;
      parts.unshift(name??(ts.isConstructorDeclaration(p)?'constructor':'<callback>'));
    }
  }
  return parts.join('/')||'<module>';
}
export function entry(rule, file, node, target, extra={}) {
  const position=node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
  return {rule,file,line:position.line+1,column:position.character+1,
    scope:functionPath(node),target,expression:normalize(node),...extra};
}
export function project(root, paths) {
  const program=ts.createProgram(paths,{allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.Latest});
  const checker=program.getTypeChecker();
  const sources=paths.map(path=>({file:slash(relative(root,path)),source:program.getSourceFile(path)}));
  const declaration = node => {const symbol=checker.getSymbolAtLocation(node);return symbol?.valueDeclaration??symbol?.declarations?.[0];};
  function binding(node, resolve, seen) {
    const decl=declaration(node);
    if(!decl || seen.has(decl))return;
    const next=new Set(seen).add(decl);
    if(ts.isVariableDeclaration(decl) && decl.initializer)return resolve(decl.initializer,next);
    if(ts.isBindingElement(decl)) {
      const names=[]; let current=decl;
      while(ts.isBindingElement(current)) {
        names.unshift(key(current.propertyName??current.name));
        current=current.parent.parent;
      }
      if(ts.isVariableDeclaration(current) && current.initializer) {
        const base=resolve(current.initializer,next);
        return base?.map(value=>[value,...names].join('.'));
      }
    }
  }
  function strings(node,seen=new Set()) {
    node=unwrap(node);if(!node)return;
    if(ts.isStringLiteralLike(node))return [node.text];
    if(ts.isTemplateExpression(node)) {
      let result=[node.head.text];
      for(const span of node.templateSpans) {
        const values=strings(span.expression,seen)??['*'];
        result=result.flatMap(prefix=>values.map(value=>prefix+value+span.literal.text));
      }
      return result;
    }
    if(ts.isConditionalExpression(node)) {
      const left=strings(node.whenTrue,seen),right=strings(node.whenFalse,seen);
      return left && right?[...new Set([...left,...right])]:undefined;
    }
    if(ts.isBinaryExpression(node) && node.operatorToken.kind===ts.SyntaxKind.PlusToken) {
      const a=strings(node.left,seen),b=strings(node.right,seen);
      return a||b?(a??['*']).flatMap(x=>(b??['*']).map(y=>x+y)):undefined;
    }
    if(ts.isCallExpression(node)&&['join','resolve'].includes(key(node.expression))) {
      return node.arguments.reduce((prefix,arg)=>prefix.flatMap(a=>(strings(arg,seen)??['*']).map(b=>a?(a+'/'+b):b)),['']);
    }
    if(ts.isPropertyAccessExpression(node)&&node.name.text==='href'&&ts.isCallExpression(node.expression)&&key(node.expression.expression)==='pathToFileURL')return strings(node.expression.arguments[0],seen);
    if(ts.isIdentifier(node))return binding(node,strings,seen);
  }
  function pathsOf(node,seen=new Set()) {
    node=unwrap(node);if(!node)return [];
    if(ts.isIdentifier(node)) {
      const decl=declaration(node);
      if(decl&&ts.isImportSpecifier(decl))return [key(decl.propertyName??decl.name)];
      return binding(node,pathsOf,seen)??[node.text];
    }
    if(node.kind===ts.SyntaxKind.ThisKeyword)return ['this'];
    if(ts.isPropertyAccessExpression(node))return pathsOf(node.expression,seen).map(p=>p+'.'+node.name.text);
    if(ts.isElementAccessExpression(node))return pathsOf(node.expression,seen).flatMap(p=>(strings(node.argumentExpression,seen)??['?']).map(s=>p+'.'+s));
    if(ts.isCallExpression(node)) {
      const name=member(node.expression);
      if(name==='bind')return pathsOf(node.expression.expression,seen);
      return pathsOf(node.expression,seen).map(p=>p+'()');
    }
    return [];
  }
  return {sources,checker,strings,pathsOf};
}
export function readJson(path) {return JSON.parse(readFileSync(path,'utf8'));}
