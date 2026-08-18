// Bumps the build number, commits it and tags the commit. Does not push and does not build: the
// outward-facing steps stay in your hands, and `eas build` is the next thing to run.
//
// The bump has to be its own commit because EAS builds committed git state, not the working tree.
// Tagging here rather than after the build means the tag exists before the binary does — if a build
// fails, the number is spent anyway (both stores refuse a number they have seen), so the tag is
// still the truth about what that number was for.
import { execFileSync } from 'node:child_process';
import { readFileSync as read, writeFileSync as write } from 'node:fs';

const CONFIG = 'app.config.ts';
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const die = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

if (run('git', ['status', '--porcelain'])) die('working tree is dirty — commit or stash first');

const source = read(CONFIG, 'utf8');
const match = source.match(/^const BUILD = (\d+);$/m);
if (!match) die(`could not find \`const BUILD = <n>;\` in ${CONFIG}`);

const next = Number(match[1]) + 1;
const { version } = JSON.parse(read('app.json', 'utf8')).expo;
const tag = `v${version}+${next}`;

if (run('git', ['tag', '--list', tag])) die(`tag ${tag} already exists`);

// CI parity, on the pre-bump tree — a number change cannot break either, but a release commit that
// fails CI can.
console.log('release: typecheck and tests');
for (const script of ['typecheck', 'test']) {
  execFileSync('npm', ['run', script], { stdio: 'inherit' });
}

write(CONFIG, source.replace(match[0], `const BUILD = ${next};`));
run('git', ['add', CONFIG]);
run('git', ['commit', '-m', `Build ${next} of ${version}`]);
run('git', ['tag', '-a', tag, '-m', `${version} build ${next}`]);

console.log(`
release: ${tag} committed and tagged (iOS buildNumber and Android versionCode both ${next})

next:
  git push && git push --tags
  eas build --profile production -p all
`);
