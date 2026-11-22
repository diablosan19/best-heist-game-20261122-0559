// Amber Vault hand-in program (Node 22, standard library only).
//
// The entry is a static browser game (game/), its screenshots (screenshots/)
// and dossier.json, the machine-readable summary the make.fun judge scores.
// This program packages them: it checks the package against the scorer's
// caps first, and only when every check passes does it write anything at
// all, so a failed run leaves no partial output behind.
//
//   MAKEFUN_OUTPUT_DIR=<dir> node main.ts     # <dir> defaults to /output

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, mirrored from the bounty's gate: a package the scorer
// would refuse is refused here instead, before a single byte is copied.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

class PackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackageError';
  }
}

const utf8Bytes = (s: string): number => Buffer.byteLength(s, 'utf8');

// Walk game/ and collect every file with its size. Directories count
// against the entry cap but are not listed. Anything that is not a plain
// file — a link, a socket — is refused on sight: the dossier refuses it
// too, and a link could smuggle in content from outside the package.
function walkGame(gameDir: string): { files: { rel: string; bytes: number }[]; entries: number; totalBytes: number } {
  if (!existsSync(gameDir)) throw new PackageError('game/: no such directory beside main.ts');
  const files: { rel: string; bytes: number }[] = [];
  let entries = 0;
  let totalBytes = 0;
  const pending: string[] = [''];
  while (pending.length > 0) {
    const rel = pending.pop()!;
    const dir = rel === '' ? gameDir : join(gameDir, rel);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      entries += 1;
      if (entry.isDirectory()) {
        pending.push(childRel);
        continue;
      }
      if (!entry.isFile()) {
        throw new PackageError(`game/${childRel}: not a plain file (links and special files are not packaged)`);
      }
      const bytes = lstatSync(join(gameDir, childRel)).size;
      files.push({ rel: childRel, bytes });
      totalBytes += bytes;
    }
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { files, entries, totalBytes };
}

function checkGame(gameDir: string): void {
  const { files, entries, totalBytes } = walkGame(gameDir);
  if (!files.some((f) => f.rel === 'index.html')) {
    throw new PackageError('game/index.html: missing (a game is static files with index.html at the root of game/)');
  }
  for (const f of files) {
    const pathBytes = utf8Bytes(f.rel);
    if (pathBytes > CAPS.game_path_max_bytes) {
      throw new PackageError(`game/${f.rel}: path is ${pathBytes} bytes, over the ${CAPS.game_path_max_bytes} allowed`);
    }
  }
  if (entries > CAPS.game_max_files) {
    throw new PackageError(`game/: ${entries} files and directories, over the ${CAPS.game_max_files} allowed`);
  }
  if (totalBytes > CAPS.game_max_bytes) {
    throw new PackageError(`game/: files total ${totalBytes} bytes, over the ${CAPS.game_max_bytes} allowed`);
  }
}

// The screenshot-side preflight: shots.json (beside main.ts) names the shots
// the entry presents, and each named file must sit in screenshots/ inside
// the byte cap. A name is a plain file name, never a path.
function checkScreenshots(root: string): string[] {
  const shotsFile = join(root, 'shots.json');
  if (!existsSync(shotsFile)) throw new PackageError('shots.json: missing beside main.ts');
  let named: unknown;
  try {
    named = JSON.parse(readFileSync(shotsFile, 'utf8'));
  } catch (err) {
    throw new PackageError(`shots.json: not valid JSON (${(err as Error).message})`);
  }
  if (!Array.isArray(named)) throw new PackageError('shots.json: expected an array of shot entries');
  const names: string[] = [];
  for (const item of named) {
    const name = (item as { name?: unknown } | null)?.name;
    if (typeof name !== 'string' || name === '' || name.includes('/') || name.includes('\\')) {
      throw new PackageError(`shots.json: bad shot name ${JSON.stringify(name)} (a plain file name is required)`);
    }
    names.push(name);
  }
  if (names.length === 0) throw new PackageError('shots.json: no shots named (the entry needs 3 or 4)');
  if (names.length > CAPS.screenshots.max) {
    throw new PackageError(`shots.json: names ${names.length} shots, over the ${CAPS.screenshots.max} allowed`);
  }
  const shotsDir = join(root, 'screenshots');
  for (const name of names) {
    const file = join(shotsDir, name);
    if (!existsSync(file) || !lstatSync(file).isFile()) {
      throw new PackageError(`screenshots/${name}: named in shots.json but not present in screenshots/`);
    }
    const size = lstatSync(file).size;
    if (size > CAPS.screenshots.max_bytes) {
      throw new PackageError(`screenshots/${name}: ${size} bytes, over the ${CAPS.screenshots.max_bytes} allowed per screenshot`);
    }
  }
  // Nothing but the named shots may sit in screenshots/: the scorer counts
  // every file there against the 4-shot cap, so a stray file would refuse
  // an otherwise good package.
  for (const entry of readdirSync(shotsDir, { withFileTypes: true })) {
    if (entry.isFile() && !names.includes(entry.name)) {
      throw new PackageError(`screenshots/${entry.name}: present but not named in shots.json (only named shots are packaged)`);
    }
  }
  return names;
}

function main(): void {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameDir = join(root, 'game');

  // Preflight, all of it before the output directory is touched. The
  // dossier is also built once against the source tree here: buildDossier
  // refuses anything the scorer would refuse, and running it now means such
  // a refusal still leaves no partial output behind. The bytes written
  // later are built from the copied tree and are the same, because the
  // dossier is a pure function of the tree's contents.
  checkGame(gameDir);
  const shotNames = checkScreenshots(root);
  buildDossier(root, CAPS);

  mkdirSync(outDir, { recursive: true });
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
  console.log(`amber-vault: packaged game/ + ${shotNames.length} screenshots + dossier.json into ${outDir}`);
}

try {
  main();
} catch (err) {
  console.error(`main.ts: packaging refused: ${(err as Error).message}`);
  process.exit(1);
}
