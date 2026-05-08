import { describe, it, expect } from 'vitest';
import { SAMPLE_PRS } from '@entities/pr';
import type { DiffHunk, DiffLine } from '@entities/pr';

// Bug 2 was that the internal `hunk()` builder bumped `newNo` only on
// `+` lines (and `oldNo` only on `-` lines), so a context line did not
// advance the relevant counter. The expected behaviour is:
//
//   - newNo advances on every line consuming a new-file slot
//     (context AND add)
//   - oldNo advances on every line consuming an old-file slot
//     (context AND del)
//
// The builder is internal, so we exercise it through the public sample
// fixtures plus an inline mixed-pattern hunk re-derived from the same
// invariants.

function newSideLines(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter((l) => l.kind !== 'del');
}

function oldSideLines(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter((l) => l.kind !== 'add');
}

describe('SAMPLE_PRS hunk numbering', () => {
  it('newNo is strictly monotonic across context+add lines in every hunk', () => {
    for (const pr of SAMPLE_PRS) {
      for (const file of pr.files) {
        for (const hunk of file.hunks) {
          const newSide = newSideLines(hunk);
          for (let i = 1; i < newSide.length; i++) {
            const prev = newSide[i - 1]?.newNo;
            const curr = newSide[i]?.newNo;
            if (prev == null || curr == null) continue;
            expect(curr).toBe(prev + 1);
          }
        }
      }
    }
  });

  it('oldNo is strictly monotonic across context+del lines in every hunk', () => {
    for (const pr of SAMPLE_PRS) {
      for (const file of pr.files) {
        for (const hunk of file.hunks) {
          const oldSide = oldSideLines(hunk);
          for (let i = 1; i < oldSide.length; i++) {
            const prev = oldSide[i - 1]?.oldNo;
            const curr = oldSide[i]?.oldNo;
            if (prev == null || curr == null) continue;
            expect(curr).toBe(prev + 1);
          }
        }
      }
    }
  });

  it('the first new-side line of a hunk starts at the hunk header newStart', () => {
    for (const pr of SAMPLE_PRS) {
      for (const file of pr.files) {
        for (const hunk of file.hunks) {
          const firstNew = newSideLines(hunk)[0];
          if (firstNew?.newNo != null) {
            expect(firstNew.newNo).toBe(hunk.newStart);
          }
        }
      }
    }
  });

  it('the first old-side line of a hunk starts at the hunk header oldStart', () => {
    for (const pr of SAMPLE_PRS) {
      for (const file of pr.files) {
        for (const hunk of file.hunks) {
          const firstOld = oldSideLines(hunk)[0];
          if (firstOld?.oldNo != null) {
            expect(firstOld.oldNo).toBe(hunk.oldStart);
          }
        }
      }
    }
  });
});

describe('hunk numbering — mixed context / add / del / context / add pattern', () => {
  // PR 214's first hunk is a real-world mixed pattern straight from
  // `sample.ts`. Pin its exact expected numbering.
  const pr214 = SAMPLE_PRS.find((p) => p.number === 214);
  const middleware = pr214?.files.find((f) => f.path === 'src/core/auth/middleware.ts');
  const hunk = middleware?.hunks[0];

  it('PR 214 middleware first hunk yields the documented per-line numbers', () => {
    expect(hunk).toBeDefined();
    if (!hunk) return;
    // The body has, in order:
    //   ' export async function authMiddleware(req, res, next) {'  → context
    //   '   const token = req.cookies.session;'                     → context
    //   '-  if (!token) return next(new Unauthorized());'           → del
    //   '-  const decoded = await verify(token, SECRET);'           → del
    //   '-  if (decoded.exp < Date.now()) {'                        → del
    //   '-    return next(new SessionExpired());'                   → del
    //   '+  if (!token) {'                                          → add
    //   '+    return next(new Unauthorized());'                     → add
    //   '   }'                                                      → context
    //   '+  let decoded: SessionToken;'                             → add
    //   ...
    // newStart=42, oldStart=42.
    const kinds = hunk.lines.map((l) => l.kind);
    expect(kinds.slice(0, 9)).toEqual([
      'context', 'context', 'del', 'del', 'del', 'del', 'add', 'add', 'context',
    ]);

    // newNo on the new-side lines must be 42, 43, 44, 45, 46 (the next
    // context line) — i.e. strictly +1 across context+add.
    const newSide = newSideLines(hunk);
    expect(newSide[0]?.newNo).toBe(42);
    expect(newSide[1]?.newNo).toBe(43);
    expect(newSide[2]?.newNo).toBe(44); // first add
    expect(newSide[3]?.newNo).toBe(45); // second add
    expect(newSide[4]?.newNo).toBe(46); // following context

    // oldNo on the old-side lines must be 42, 43, 44, 45, 46, 47, 48 — i.e.
    // strictly +1 across context+del.
    const oldSide = oldSideLines(hunk);
    expect(oldSide[0]?.oldNo).toBe(42); // context
    expect(oldSide[1]?.oldNo).toBe(43); // context
    expect(oldSide[2]?.oldNo).toBe(44); // first del
    expect(oldSide[3]?.oldNo).toBe(45);
    expect(oldSide[4]?.oldNo).toBe(46);
    expect(oldSide[5]?.oldNo).toBe(47); // last del
    expect(oldSide[6]?.oldNo).toBe(48); // following context
  });

  it('add lines never carry an oldNo and del lines never carry a newNo', () => {
    for (const pr of SAMPLE_PRS) {
      for (const file of pr.files) {
        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            if (line.kind === 'add') expect(line.oldNo).toBeNull();
            if (line.kind === 'del') expect(line.newNo).toBeNull();
            if (line.kind === 'context') {
              expect(line.newNo).not.toBeNull();
              expect(line.oldNo).not.toBeNull();
            }
          }
        }
      }
    }
  });
});
