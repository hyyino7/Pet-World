import {ts,walk,unwrap,key,member,entry} from './ast.mjs';

const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const subset=(a,b)=>a.every(v=>b.includes(v));
export function scanVocabulary(project) {
  const definitions=[],bare=[],judgments=[];
  for(const {file,source} of project.sources) {
    const seen=new Set();
    const collect=(node,values,shape,minimum=3)=>{
      if(!values || values.some(v=>typeof v!=='string'))return;
      values=[...new Set(values)].sort();if(values.length<minimum)return;
      const id=node.pos+':'+JSON.stringify(values);if(seen.has(id))return;seen.add(id);
      definitions.push(entry('R8',file,node,values.join('|'),{values,shape}));
    };
    walk(source,node=>{
      if(ts.isArrayLiteralExpression(node))collect(node,node.elements.map(e=>ts.isStringLiteralLike(e)?e.text:undefined),'array',member(node.parent)==='includes'||key(node.parent.name)==='enum'?2:3);
      if(ts.isUnionTypeNode(node))collect(node,node.types.map(t=>ts.isLiteralTypeNode(t)&&ts.isStringLiteralLike(t.literal)?t.literal.text:undefined),'union',2);
      if(ts.isSwitchStatement(node))collect(node,node.caseBlock.clauses.filter(ts.isCaseClause).map(c=>project.strings(c.expression)?.[0]),'switch',2);
      if(ts.isPropertyAssignment(node)&&['oneOf','anyOf'].includes(key(node.name))) {
        const array=unwrap(node.initializer),fields=new Map();
        if(ts.isArrayLiteralExpression(array))for(const branch of array.elements)walk(branch,child=>{
          if(!ts.isPropertyAssignment(child)||key(child.name)!=='const')return;
          const field=key(child.parent.parent?.name),value=project.strings(child.initializer)?.[0];
          if(field&&value)(fields.get(field)??(fields.set(field,[]),fields.get(field))).push(value);
        });
        for(const values of fields.values())collect(node,values,'schema const',2);
      }
      // feeling 的标签表也是一份定义，单独保留位置以便与文档份数核对。
      if(ts.isObjectLiteralExpression(node)&&node.properties.length>=3&&node.properties.every(p=>ts.isPropertyAssignment(p)&&ts.isStringLiteralLike(p.initializer)))collect(node,node.properties.map(p=>key(p.name)),'labels');
      if((ts.isPropertySignature(node)||ts.isPropertyDeclaration(node))&&['kind','action','status','type'].includes(key(node.name))&&node.type?.kind===ts.SyntaxKind.StringKeyword) {
        let exported=file.startsWith('src/contracts/');
        for(let p=node.parent;p&&!ts.isSourceFile(p);p=p.parent)if(p.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))exported=true;
        if(exported)bare.push(entry('R8',file,node,key(node.name),{shape:'bare string'}));
      }
      const field=n=>{
        n=unwrap(n);if(!n)return;
        if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='String')return field(n.arguments[0]);
        return ['kind','action'].includes(member(n)??key(n))?member(n)??key(n):undefined;
      };
      let name;
      if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) {
        if(project.strings(node.right))name=field(node.left);
        if(project.strings(node.left))name??=field(node.right);
      }
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)) {
        const op=node.expression.name.text;
        if(op==='includes')name=field(node.arguments[0]);
        if(['startsWith','endsWith'].includes(op)&&project.strings(node.arguments[0]))name=field(node.expression.expression);
      }
      if(ts.isSwitchStatement(node))name=field(node.expression);
      if(name)judgments.push(entry('R8-count',file,node,name));
    });
  }
  // 每个定义单独入基线，目标中包含对方身份；不能用重复组总数抵消增删。
  const duplicates=[];
  for(let i=0;i<definitions.length;i++)for(let j=i+1;j<definitions.length;j++) {
    const a=definitions[i],b=definitions[j];
    if(a.file===b.file||!(subset(a.values,b.values)||subset(b.values,a.values)))continue;
    const relation=same(a.values,b.values)?'重复':'子集';
    for(const [item,other] of [[a,b],[b,a]])duplicates.push({...item,target:JSON.stringify({values:item.values,other:{file:other.file,scope:other.scope,expression:other.expression}}),relation,other:{file:other.file,line:other.line}});
  }
  return {reports:[...duplicates,...bare],definitions,bare,judgments};
}
