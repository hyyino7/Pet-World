import type { ArtifactRef, MemoryViewStamp, ModuleId } from '../contracts/common.js';
import type { ArtifactInfo, ResourceService } from '../contracts/resources.js';
import type { CoreRuntime } from './core.js';
import { bytesDigest, check, digest, id, integer, now, reject, revision, text, timestamp } from './storage.js';

interface Upload {
  uploadId: string; producer: ModuleId; mediaType: string; kind: ArtifactInfo['kind'];
  byteLength: number; offset: number; expiresAt: string; state: 'open' | 'committed' | 'aborted';
  artifactId: string | null; principal: string;
}
const MAX_CHUNK = 256 * 1024;
const MAX_ARTIFACT = 16 * 1024 * 1024;
const MAX_STORE = 256 * 1024 * 1024;

/** Bytes and their catalogue are published in the same SQLite transaction. */
export class CoreResources {
  readonly port: ResourceService;
  constructor(readonly runtime: CoreRuntime) {
    const store = runtime.store;
    store.db.exec('CREATE TABLE IF NOT EXISTS bytes (id TEXT PRIMARY KEY, data BLOB NOT NULL)');
    this.port = {
      beginUpload: runtime.call('resources.beginUpload', true, (input, _context, principal) => {
        check(input.producer === principal.module, 'Artifact producer must match host module');
        text(input.mediaType, 'mediaType', 128); check(/^[\w.+-]+\/[\w.+-]+$/.test(input.mediaType), 'Invalid mediaType');
        check(['asset', 'content', 'checkpoint', 'export', 'backup', 'withdrawal_guard'].includes(input.kind), 'Invalid artifact kind');
        check(input.retentionPolicyRef === 'manual', 'Only manual retention is supported');
        integer(input.byteLength, 'byteLength', 0, MAX_ARTIFACT);
        const reserved = store.all<Upload>('upload').filter(x => x.state === 'open').reduce((n, x) => n + x.byteLength, 0);
        const used = store.all<ArtifactInfo>('artifact').filter(x => x.state !== 'purged').reduce((n, x) => n + x.byteLength, 0);
        if (used + reserved + input.byteLength > MAX_STORE) reject('LIMIT_REACHED', 'Core resource storage quota reached');
        const upload: Upload = { uploadId: id('upload'), producer: input.producer, mediaType: input.mediaType, kind: input.kind,
          byteLength: input.byteLength, offset: 0, expiresAt: new Date(Date.now() + 3600_000).toISOString(), state: 'open', artifactId: null,
          principal: `${principal.module}:${principal.actor.id}` };
        store.put('upload', upload.uploadId, upload); store.db.prepare('INSERT INTO bytes VALUES(?,?)').run(upload.uploadId, Buffer.alloc(0));
        return { uploadId: upload.uploadId, maxChunkBytes: MAX_CHUNK, expiresAt: upload.expiresAt };
      }),
      writeChunk: runtime.call('resources.writeChunk', true, (input, _context, principal) => {
        const upload = this.upload(input.uploadId, `${principal.module}:${principal.actor.id}`);
        integer(input.offset, 'offset'); text(input.dataBase64, 'base64 data', MAX_CHUNK * 2);
        check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.dataBase64), 'Invalid base64');
        const bytes = Buffer.from(input.dataBase64, 'base64');
        check(bytes.length > 0 && bytes.length <= MAX_CHUNK && bytes.toString('base64') === input.dataBase64, 'Invalid chunk length/encoding');
        check(bytesDigest(bytes) === input.chunkDigest, 'Chunk digest mismatch');
        if (input.offset !== upload.offset) reject('CONFLICT', 'Chunk offset does not match upload offset');
        check(upload.offset + bytes.length <= upload.byteLength, 'Chunk exceeds declared length');
        const previous = this.bytes(upload.uploadId);
        store.db.prepare('UPDATE bytes SET data=? WHERE id=?').run(Buffer.concat([previous, bytes]), upload.uploadId);
        upload.offset += bytes.length; store.put('upload', upload.uploadId, upload); return { nextOffset: upload.offset };
      }),
      commitUpload: runtime.call('resources.commitUpload', true, (input, _context, principal) => {
        const upload = this.upload(input.uploadId, `${principal.module}:${principal.actor.id}`);
        check(upload.offset === upload.byteLength, 'Upload is incomplete');
        check(input.holder.module === principal.module, 'Holder must match caller module'); text(input.holder.recordId, 'holder recordId', 256);
        if (input.memoryView !== null) reject('INELIGIBLE', 'Derived artifacts need a bound Memory provider');
        const bytes = this.bytes(upload.uploadId); check(bytesDigest(bytes) === input.expectedContentDigest, 'Artifact digest mismatch');
        const info = this.publish(bytes, upload.mediaType, upload.kind, upload.producer, input.holder, input.memoryView);
        upload.state = 'committed'; upload.artifactId = info.ref.artifactId;
        store.put('upload', upload.uploadId, upload); store.db.prepare('DELETE FROM bytes WHERE id=?').run(upload.uploadId);
        return info;
      }),
      abortUpload: runtime.call('resources.abortUpload', true, (input, _context, principal) => {
        const upload = store.require<Upload>('upload', input.uploadId);
        if (upload.principal !== `${principal.module}:${principal.actor.id}`) reject('UNAUTHORIZED', 'Upload belongs to another principal');
        if (upload.state === 'committed') reject('CONFLICT', 'Committed upload cannot be aborted');
        upload.state = 'aborted'; store.put('upload', upload.uploadId, upload); store.db.prepare('DELETE FROM bytes WHERE id=?').run(upload.uploadId);
        return { aborted: true };
      }),
      inspectArtifact: runtime.call('resources.inspectArtifact', false, input => this.inspect(input.artifact)),
      readArtifact: runtime.call('resources.readArtifact', false, (input, context) => {
        const info = this.inspect(input.artifact);
        if (info.state === 'purged') reject('NOT_FOUND', 'Artifact bytes were purged');
        if (input.access.kind !== 'ordinary') reject('DISABLED', 'Maintenance reads require coordinator-owned permits, not caller strings');
        check(['presentation', 'execution', 'export', 'inspection'].includes(input.access.purpose), 'Invalid artifact read purpose');
        if (info.memoryView !== null || input.access.memoryUse !== null) reject('INELIGIBLE', 'Memory provider is absent');
        if (['backup', 'withdrawal_guard'].includes(info.kind)) reject('UNAUTHORIZED', 'Protected maintenance artifacts cannot be read through an ordinary view');
        if (info.kind === 'export') runtime.authority.owner(context, 'resources.readArtifact', runtime.config.ownerActorId);
        integer(input.offset, 'offset', 0, info.byteLength); integer(input.maxBytes, 'maxBytes', 1, MAX_CHUNK);
        const bytes = this.bytes(info.ref.artifactId);
        check(bytesDigest(bytes) === info.ref.contentDigest, 'Stored artifact integrity check failed');
        const end = Math.min(bytes.length, input.offset + input.maxBytes);
        return { dataBase64: bytes.subarray(input.offset, end).toString('base64'), nextOffset: end < bytes.length ? end : null, contentDigest: info.ref.contentDigest };
      }),
      retainArtifact: runtime.call('resources.retainArtifact', true, (input, _context, principal) => {
        const info = this.inspect(input.artifact); revision(info.revision, input.expectedRevision);
        check(input.holder.module === principal.module, 'Holder must match caller'); text(input.holder.recordId, 'recordId', 256);
        if (info.state === 'purged') reject('NOT_FOUND', 'Artifact bytes were purged');
        if (['backup', 'withdrawal_guard'].includes(info.kind)) reject('UNAUTHORIZED', 'Maintenance holds belong to the coordinator');
        if (!info.holders.some(x => digest(x) === digest(input.holder))) info.holders = [...info.holders, input.holder];
        info.state = 'available'; info.revision++; store.put('artifact', info.ref.artifactId, info); return info;
      }),
      releaseArtifact: runtime.call('resources.releaseArtifact', true, (input, _context, principal) => {
        const info = this.inspect(input.artifact); revision(info.revision, input.expectedRevision);
        check(input.holder.module === principal.module, 'Holder must match caller');
        if (['backup', 'withdrawal_guard'].includes(info.kind)) reject('UNAUTHORIZED', 'Maintenance holds belong to the coordinator');
        info.holders = info.holders.filter(x => digest(x) !== digest(input.holder));
        info.state = info.holders.length ? 'available' : 'released'; info.revision++;
        store.put('artifact', info.ref.artifactId, info); return info;
      }),
      collectGarbage: runtime.call('resources.collectGarbage', true, input => {
        check(input.policyRef === 'manual', 'Unknown retention policy'); timestamp(input.before);
        check(Date.parse(input.before) <= Date.now(), 'GC cutoff cannot be in the future');
        for (const info of store.all<ArtifactInfo>('artifact')) {
          if (info.state === 'released' && info.holders.length === 0 && Date.parse(info.createdAt) < Date.parse(input.before)) {
            store.db.prepare('DELETE FROM bytes WHERE id=?').run(info.ref.artifactId);
            info.state = 'purged'; info.revision++; store.put('artifact', info.ref.artifactId, info);
          }
        }
        for (const upload of store.all<Upload>('upload')) {
          if (upload.state === 'open' && Date.parse(upload.expiresAt) < Date.now()) {
            upload.state = 'aborted'; store.put('upload', upload.uploadId, upload); store.db.prepare('DELETE FROM bytes WHERE id=?').run(upload.uploadId);
          }
        }
        return runtime.receipt(id('gc'), 'completed');
      }, true),
    };
  }
  private upload(uploadId: string, principal: string): Upload {
    const upload = this.runtime.store.require<Upload>('upload', uploadId);
    if (upload.principal !== principal) reject('UNAUTHORIZED', 'Upload belongs to another principal');
    if (upload.state !== 'open') reject('CONFLICT', 'Upload is not open');
    if (Date.parse(upload.expiresAt) <= Date.now()) reject('DISABLED', 'Upload expired');
    return upload;
  }
  bytes(key: string): Buffer {
    const row = this.runtime.store.db.prepare('SELECT data FROM bytes WHERE id=?').get(key);
    if (!row) reject('NOT_FOUND', 'Artifact bytes not found');
    return Buffer.from(row.data as Uint8Array);
  }
  inspect(ref: ArtifactRef): ArtifactInfo {
    const info = this.runtime.store.require<ArtifactInfo>('artifact', ref.artifactId);
    if (digest(info.ref) !== digest(ref)) reject('CONFLICT', 'Artifact reference does not match immutable catalogue');
    if (info.scopeId !== this.runtime.config.scopeId || info.companionId !== this.runtime.config.companionId) reject('UNAUTHORIZED', 'Artifact is outside caller scope');
    return info;
  }
  /** Internal publication; caller owns the surrounding database transaction. */
  publish(bytes: Uint8Array, mediaType: string, kind: ArtifactInfo['kind'], producer: ModuleId,
    holder: ArtifactInfo['holders'][number], memoryView: MemoryViewStamp | null = null): ArtifactInfo {
    check(bytes.length <= MAX_ARTIFACT, 'Artifact exceeds size cap');
    const used = Number(this.runtime.store.db.prepare('SELECT coalesce(sum(length(data)),0) AS used FROM bytes').get()!.used);
    if (used + bytes.length > MAX_STORE) reject('LIMIT_REACHED', 'Resource storage quota reached');
    const info: ArtifactInfo = { ref: { artifactId: id('artifact'), mediaType, contentDigest: bytesDigest(bytes) },
      revision: 1, producer, companionId: this.runtime.config.companionId, scopeId: this.runtime.config.scopeId,
      kind, byteLength: bytes.length, createdAt: now(), state: 'available', memoryView, holders: [holder] };
    this.runtime.store.put('artifact', info.ref.artifactId, info);
    this.runtime.store.db.prepare('INSERT INTO bytes VALUES(?,?)').run(info.ref.artifactId, bytes);
    return info;
  }
}
