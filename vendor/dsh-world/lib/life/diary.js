import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { collectPaths } from "./activity.js";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const diaryName = /^(\d{4}-\d{2}-\d{2})\.md$/;
export function createDiaryReader(diaryDir) {
    const dates = () => existsSync(diaryDir) ? readdirSync(diaryDir).filter(name => diaryName.test(name)).map(name => name.slice(0, 10)).sort().reverse() : [];
    /** Only YYYY-MM-DD names are accepted, so a date can never escape the diary directory. */
    const read = (date) => { const file = join(diaryDir, `${date}.md`); return datePattern.test(date) && existsSync(file) ? readFileSync(file, 'utf8') : undefined; };
    return { dates, read };
}
/** The host's file tools that change a file; reading tools and the shell are not judged. */
const DIARY_WRITERS = new Set(['write', 'edit']);
/**
 * Why a file tool call may not run: it changes the diary of a day already closed. A wrong or outgrown entry is
 * corrected in today's diary, so what she wrote then stays as she wrote it. Only `YYYY-MM-DD.md` files directly in the
 * diary directory are dated diaries; any other file there is left to her. Relative paths resolve against `cwd`. Admitted backfill dates authorize write creation only; an existing historical entry stays closed.
 */
export function closedDiaryRefusal(tool, args, diaryDir, cwd, open, today, backfill = new Set()) {
    if (!DIARY_WRITERS.has(tool))
        return undefined;
    for (const path of collectPaths(args, false, [])) {
        const file = resolve(cwd, path);
        const day = diaryName.exec(basename(file))?.[1];
        if (!day || relative(resolve(diaryDir), dirname(file)) !== '') continue;
        // A pending review authorizes creation, never reopening old contents.
        // lstat also treats a dangling link as an existing, protected entry.
        if (backfill.has(day) && day < today) {
            if (tool === 'write' && !lstatSync(file,{throwIfNoEntry:false})) continue;
        } else if (open.has(day)) continue;
        return `${day} 的日记已经合上了，不能再改。写错了或者现在想法不一样了，就写进今天（${today}）的日记：哪里记错了、现在怎么看。`;
    }
    return undefined;
}
