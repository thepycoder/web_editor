import * as fs from 'fs';
import * as path from 'path';

const emptyCmsRoot = path.join(__dirname, '..', 'fixtures', 'empty-cms-project');

/** Removes files written by the Go host into the shared empty Playwright project dir. */
export function resetEmptyCmsFixture(): void {
  for (const f of ['.web-editor.json', 'index.html']) {
    try {
      fs.unlinkSync(path.join(emptyCmsRoot, f));
    } catch {
      /* absent is fine */
    }
  }
  const assetsDir = path.join(emptyCmsRoot, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const x of fs.readdirSync(assetsDir)) {
      try {
        fs.unlinkSync(path.join(assetsDir, x));
      } catch {
        /* */
      }
    }
  }
}
