export declare function createDiaryReader(diaryDir: string): {
    dates: () => string[];
    read: (date: string) => string | undefined;
};
/**
 * Why a file tool call may not run: it changes the diary of a day already closed. A wrong or outgrown entry is
 * corrected in today's diary, so what she wrote then stays as she wrote it. Only `YYYY-MM-DD.md` files directly in the
 * diary directory are dated diaries; any other file there is left to her. Relative paths resolve against `cwd`. An admitted backfill date permits only creating a missing file with write; existing historical records remain closed.
 */
export declare function closedDiaryRefusal(tool: string, args: unknown, diaryDir: string, cwd: string, open: ReadonlySet<string>, today: string, backfill?: ReadonlySet<string>): string | undefined;
