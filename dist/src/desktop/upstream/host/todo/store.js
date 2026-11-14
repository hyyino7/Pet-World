/**
 * 待办持久化：单个 JSON 文件的读与原子写，全部操作在同一队列里串行。
 *
 * 不负责校验 HTTP 输入（归 ../routes/todos）与提醒节奏（归 ./policy）。
 * 缓存只是磁盘的副本：每次落盘成功后才替换缓存，因此读不到写了一半的状态。
 * 任何一步失败都原样抛出，由路由归一成内部错误；不静默丢用户的待办。
 * @module dsh-pet/src/host/todo/store
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cloneTodo, parseTodoFile, sortTodos, TODO_FILE_VERSION } from './types.js';
/** 待办文件名：落在插件用户数据目录下；宿主建库与设置页展示路径共用这一份。 */
export const TODO_FILE_NAME = 'todos.json';
/** 异常 → 一行可读原因（日志用，不外泄给 HTTP 响应）。 */
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
export class TodoStore {
    constructor(options) {
        this.file = options.file;
        this.log = options.log;
        this.now = options.now ?? (() => Date.now());
        this.queue = Promise.resolve();
        this.cached = null;
        this.seq = 0;
    }
    /** 全部待办（排序后的副本）。 */
    list() {
        return this.run(async () => {
            await this.ensureLoaded();
            return sortTodos(this.cached ?? []).map(cloneTodo);
        });
    }
    /**
     * 新建一条。
     *
     * id 由时间戳 + 进程内序号生成：重启后时间戳不同，旧 id 不会撞。
     *
     * @param input - 已校验的正文与到期时刻。
     * @returns 落盘成功后的记录副本。
     */
    create(input) {
        return this.run(async () => {
            await this.ensureLoaded();
            const at = this.now();
            this.seq += 1;
            const todo = {
                id: `todo-${at.toString(36)}-${this.seq.toString(36)}`,
                text: input.text,
                dueAt: input.dueAt,
                done: false,
                createdAt: at,
                updatedAt: at,
                completedAt: null,
                lastRemindedAt: null,
            };
            await this.persist([...(this.cached ?? []), todo]);
            return cloneTodo(todo);
        });
    }
    /**
     * 更新一条。
     *
     * 改期限或重新打开都会清空 `lastRemindedAt`：提醒按新的到期时刻重新排期。
     *
     * @returns 更新后的记录；id 不存在返回 null。
     */
    update(id, patch) {
        return this.run(async () => {
            await this.ensureLoaded();
            const list = this.cached ?? [];
            const index = list.findIndex((todo) => todo.id === id);
            if (index < 0)
                return null;
            const prev = list[index];
            const at = this.now();
            const next = { ...prev, updatedAt: at };
            if (patch.text !== undefined)
                next.text = patch.text;
            if (patch.dueAt !== undefined) {
                next.dueAt = patch.dueAt;
                next.lastRemindedAt = null;
            }
            if (patch.done !== undefined) {
                next.done = patch.done;
                next.completedAt = patch.done ? (prev.completedAt ?? at) : null;
                if (!patch.done)
                    next.lastRemindedAt = null;
            }
            const updated = [...list];
            updated[index] = next;
            await this.persist(updated);
            return cloneTodo(next);
        });
    }
    /**
     * 删除一条。
     *
     * @returns 删掉的条数；0 表示本来就没有（幂等，不当成错误）。
     */
    remove(id) {
        return this.run(async () => {
            await this.ensureLoaded();
            const list = this.cached ?? [];
            const next = list.filter((todo) => todo.id !== id);
            if (next.length === list.length)
                return 0;
            await this.persist(next);
            return 1;
        });
    }
    /** 记下一次提醒时刻：只动 `lastRemindedAt`，不推进 `updatedAt`（那不是用户修改）。 */
    markReminded(id, at) {
        return this.run(async () => {
            await this.ensureLoaded();
            const list = this.cached ?? [];
            const index = list.findIndex((todo) => todo.id === id);
            if (index < 0)
                return;
            const next = [...list];
            next[index] = { ...list[index], lastRemindedAt: at };
            await this.persist(next);
        });
    }
    /** 队列：上一个任务结束后执行下一个；失败不影响后续任务。 */
    run(task) {
        const next = this.queue.then(task, task);
        this.queue = next.then(() => undefined, () => undefined);
        return next;
    }
    async ensureLoaded() {
        if (this.cached !== null)
            return;
        this.cached = await this.readDisk();
    }
    async readDisk() {
        let raw;
        try {
            raw = await readFile(this.file, 'utf8');
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.log.warn?.(`[dsh-pet] 待办文件读取失败，按空清单继续：${messageOf(error)}`);
            }
            return [];
        }
        try {
            return parseTodoFile(JSON.parse(raw));
        }
        catch (error) {
            // 坏文件不备份、不改写：先按空清单跑，下一次写入自然覆盖。
            this.log.warn?.(`[dsh-pet] 待办文件解析失败，按空清单继续：${messageOf(error)}`);
            return [];
        }
    }
    /** 原子写：临时文件写完再 rename，进程中途退出不会留下半个 JSON。 */
    async persist(next) {
        const file = { version: TODO_FILE_VERSION, todos: [...next] };
        await mkdir(dirname(this.file), { recursive: true });
        const temp = this.file + '.tmp';
        await writeFile(temp, JSON.stringify(file, null, 2) + '\n', 'utf8');
        await rename(temp, this.file);
        this.cached = [...next];
    }
}
