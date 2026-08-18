// Bumps the build number, commits it and tags the commit. Does not push and does not build: the
// outward-facing steps stay in your hands, and `eas build` is the next thing to run. README's
// "Build and release" section covers why the bump is its own commit and why the tag comes first.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CONFIG_PATH = 'app.json';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const die = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

if (!existsSync(CONFIG_PATH)) {
  die(`${CONFIG_PATH} not found — run this from the repo root, or use \`npm run release\``);
}
if (git('status', '--porcelain')) die('working tree is dirty — commit or stash first');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const { expo } = config;

// iOS wants a string and Android a number, so the two can be hand-edited apart.
const current = Number(expo.ios.buildNumber);
if (!Number.isInteger(current) || expo.android.versionCode !== current) {
  die(
    `${CONFIG_PATH} needs one whole build number in both keys, found ios.buildNumber ` +
      `${JSON.stringify(expo.ios.buildNumber)} and android.versionCode ${JSON.stringify(expo.android.versionCode)}`,
  );
}

const next = current + 1;
const tag = `v${expo.version}+${next}`;

if (git('tag', '--list', tag)) die(`tag ${tag} already exists`);

// The checks CI runs, from the same definition, on the pre-bump tree: a number change cannot break
// them, but a release commit that fails CI can, and this commit may never have been pushed for CI
// to see it.
execFileSync('npm', ['run', 'ci'], { stdio: 'inherit' });

// Mutated in place and re-serialised, so key order survives and the diff is the two numbers.
expo.ios.buildNumber = String(next);
expo.android.versionCode = next;
writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);

git('add', CONFIG_PATH);
git('commit', '-m', `Build ${next} of ${expo.version}`);
git('tag', '-a', tag, '-m', `${expo.version} build ${next}`);

console.log(`
release: ${tag} committed and tagged (iOS buildNumber and Android versionCode both ${next})

next:
  git push && git push --tags
  eas build --profile production -p all
`);
