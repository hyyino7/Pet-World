import {ts,walk,unwrap,member,key,entry} from './ast.mjs';
import {posix} from 'node:path';

export function allowed(layers,from,to) {
  return from===to || !!layers.modules[from]?.dependencies.includes(to);
}
export function moduleOf(layers,file) {
  return Object.entries(layers.modules).find(([,m])=>file.startsWith(m.root))?.[0]
    ?? Object.entries(layers.modules).find(([,m])=>m.generated.some(g=>g.sources.includes(file)))?.[0];
}
function resolveImport(file,name,imports) {
  if(name.startsWith('#')) {
    const match=Object.entries(imports).find(([pattern])=>pattern.includes('*')?name.startsWith(pattern.split('*')[0])&&name.endsWith(pattern.split('*')[1]):pattern===name);
    if(!match)return '?';
    const [pattern,target]=match;
    if(typeof target!=='string')return '?';
    name=pattern.includes('*')?target.replace('*',name.slice(pattern.indexOf('*'),pattern.endsWith('*')?undefined:-pattern.split('*')[1].length)):target;
    return posix.normalize(name).replace(/^\.\//,'');
  }
  return name.startsWith('.')?posix.normalize(posix.join(posix.dirname(file),name)):undefined;
}
const contextPath = path => /^(?:(?:this\.)?ctx|scope|context)$/.test(path);
export function scanRules(project,layers,imports) {
  const reports=[],edges=[];
  const services=Object.fromEntries(Object.entries(layers.modules).flatMap(([id,m])=>m.services.map(s=>[s,id])));
  const publishers={};
  for(const [id,m] of Object.entries(layers.modules))for(const event of m.publishes)(publishers[event]??=[]).push(id);
  for(const {file,source} of project.sources) {
    const from=moduleOf(layers,file);
    if(!from){reports.push(entry('R1',file,source,'?',{reason:'源文件未声明模块归属'}));continue;}
    const module=layers.modules[from];
    const add=(rule,node,target,details)=>reports.push(entry(rule,file,node,target,details));
    const service=(node,names,complete=!!names)=>{
      if(!complete){add('R2',node,'?',{reason:'无法静态判定'});return;}
      for(const name of names) {
        if(!name.startsWith('pet'))continue;
        edges.push({rule:'R2',from,to:services[name]??'?',file,target:name});
        if(!services[name] || !allowed(layers,from,services[name]) || !module.reads.includes(name))add('R2',node,name,{from,to:services[name],reason:'服务读取未获准或方向违规'});
      }
    };
    const imported=(node,names,complete=!!names)=>{
      if(!complete){add('R1',node,'?',{reason:'无法静态判定本地依赖'});return;}
      for(const name of names) {
        const target=resolveImport(file,name,imports);if(!target || target.startsWith('vendor/'))continue;
        const to=moduleOf(layers,target);
        if(!to){add('R1',node,target,{reason:'本地依赖未声明模块归属'});continue;}
        edges.push({rule:'R1',from,to,file,target});
        if(!allowed(layers,from,to))add('R1',node,target,{from,to,reason:'依赖方向违规'});
      }
    };
    const readService=(node,value)=>{const result=project.stringResult(value);service(node,result.values,result.complete);};
    const readImport=(node,value)=>{const result=project.stringResult(value);imported(node,result.values,result.complete);};
    walk(source,node=>{
      if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) {
        if(node.moduleSpecifier)readImport(node,node.moduleSpecifier);
      }
      if(ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))readImport(node,node.moduleReference.expression);
      if(ts.isImportTypeNode(node))readImport(node,ts.isLiteralTypeNode(node.argument)?node.argument.literal:node.argument);
      if(ts.isCallExpression(node)) {
        const paths=project.pathsOf(node.expression),op=member(node.expression);
        if(node.expression.kind===ts.SyntaxKind.ImportKeyword || paths.some(p=>p==='require'||p.endsWith('createRequire()'))) {
          let {values:names,complete}=project.stringResult(node.arguments[0]);
          const argument=unwrap(node.arguments[0]);
          if(!names&&argument&&ts.isCallExpression(argument)&&['join','resolve'].includes(key(argument.expression))) {
            const tail=project.stringResult(argument.arguments.at(-1));
            if(tail.complete&&tail.values.every(name=>name.startsWith('vendor/'))){names=tail.values;complete=true;}
          }
          imported(node,names,complete);
        }
        if(paths.some(p=>p.endsWith('.get')&&contextPath(p.slice(0,-4))))readService(node,node.arguments[0]);
        if((op==='on'||op==='emit') && paths.some(p=>contextPath(p.slice(0,-op.length-1)))) {
          const {values:names,complete}=project.stringResult(node.arguments[0]);
          if(!complete)add('R3',node,'?',{reason:'无法静态判定事件'});
          for(const name of complete?names:[]) {
            if(op==='emit') {
              if(name.startsWith('pet/')&&!module.publishes.includes(name))add('R3',node,name,{reason:'发布事件未声明'});
            } else {
              const owners=publishers[name]??[];
              for(const owner of owners)edges.push({rule:'R3',from,to:owner,file,target:name});
              if(!module.subscribes.includes(name) || name.startsWith('pet/')&&!owners.length || owners.some(id=>layers.modules[id].layer>module.layer))add('R3',node,name,{from,to:owners.join('|')||'?',reason:'订阅未声明或来自上层',publishers:owners});
            }
          }
        }
      }
      if(ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)) {
        const bases=project.pathsOf(node.expression);
        if(bases.some(contextPath)) {
          const {values:names,complete}=ts.isPropertyAccessExpression(node)?{values:[node.name.text],complete:true}:project.stringResult(node.argumentExpression);
          if(!complete)add('R2',node,'?',{reason:'无法静态判定计算属性'});
          else if(names.some(n=>n.startsWith('pet')))service(node,names);
        }
      }
      if(ts.isBindingElement(node)) {
        const names=project.pathsOf(node.name);
        for(const path of names) {
          const serviceName=path.split('.').at(-1);
          if(contextPath(path.slice(0,-serviceName.length-1))) {
            if(serviceName==='?')service(node,undefined);
            else if(serviceName.startsWith('pet'))service(node,[serviceName]);
          }
        }
      }
      if((ts.isPropertyAssignment(node)||ts.isVariableDeclaration(node))&&key(node.name)==='inject'&&node.initializer) {
        const value=unwrap(node.initializer);
        if(ts.isArrayLiteralExpression(value))for(const item of value.elements)readService(item,item);
        else if(ts.isObjectLiteralExpression(value))for(const item of value.properties) {
          if(['required','optional'].includes(key(item.name))&&ts.isPropertyAssignment(item)&&ts.isArrayLiteralExpression(unwrap(item.initializer))) {
            for(const name of unwrap(item.initializer).elements)readService(name,name);
          } else if(item.name)service(item,[key(item.name)??'?']);
        }
        else if(!ts.isArrowFunction(value)&&!ts.isFunctionExpression(value))service(node,undefined);
      }
      if(ts.isBinaryExpression(node)&&ts.isAssignmentOperator(node.operatorToken.kind)) {
        if(from==='core')return;
        const targets=[];
        const collect=left=>{
          left=unwrap(left);
          if(ts.isObjectLiteralExpression(left))for(const prop of left.properties)collect(ts.isPropertyAssignment(prop)?prop.initializer:prop.name);
          else if(ts.isArrayLiteralExpression(left))left.elements.forEach(collect);
          else targets.push(...project.pathsOf(left));
        };
        collect(node.left);
        for(const target of targets.filter(p=>/^(?:this\.)?host\.native\./.test(p)||/\.petCore\.native\./.test(p))) {
          edges.push({rule:'R4',from,to:'core',file,target});
          add('R4',node,target,{from,to:'core',reason:'直接改写 Core 的原生接缝'});
        }
      }
    });
  }
  return {reports,edges};
}
