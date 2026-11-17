// Public diagnostics contain only fixed codes and instructions, never causes.
const messages = {
  'dsh-running':'DSH 停写检查未通过；退出全部 DSH 进程后重试。',
  'writer-running':'Core、Economy 或 Memory 停写检查未通过；关闭写入者后重试。',
  'lock-held':'迁移锁被占用；先确认没有迁移进程在运行，再手动删除迁移锁后重试。',
  'lock-invalid':'迁移锁无效或已变化；确认没有迁移进程后检查迁移锁。',
  'receipt-invalid':'安装回执缺失、损坏或尚未完成安装。',
  'binding-changed':'身份或存储绑定检查未通过；核对隔离安装与工作区绑定。',
  'symlink-or-hardlink':'发现软链接、硬链接或非普通数据文件；检查文件类型。',
  'manifest-mismatch':'存储版本清单损坏或与预期不一致；核对后再迁移。',
  'journal-exists':'已有迁移日志：上次迁移未完成时用 --resume 续做；已完成则无需再跑，先用 status 查看。',
  'journal-invalid':'迁移日志损坏或与当前操作不一致；检查日志并使用原备份恢复。',
  'resume-journal-missing':'续做日志缺失；使用迁移前的原备份恢复。',
  'backup-invalid':'备份创建或校验未通过；检查原备份并使用已验证的迁移前备份恢复。',
  usage:'命令参数无效；核对命令、安装回执参数及备份或续做选项。',
  unknown:'发生未分类错误；停止迁移并检查隔离环境，必要时使用原备份恢复。',
};
export class MigrationError extends Error {
  constructor(code) { super(messages[code] ?? messages.unknown); this.code = Object.hasOwn(messages,code) ? code : 'unknown'; }
}
export function requireMigration(condition, code) { if (!condition) throw new MigrationError(code); }
export function checked(code, operation) {
  try { return operation(); }
  catch (error) { if (error instanceof MigrationError) throw error; throw new MigrationError(code); }
}
export function diagnostic(error) {
  const safe = error instanceof MigrationError ? error : new MigrationError('unknown');
  return JSON.stringify({code:safe.code, message:messages[safe.code]});
}
