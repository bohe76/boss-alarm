import { readFileSync } from 'node:fs';

test('release version, cache URLs, changelog and user notices stay in sync', () => {
    const read = file => readFileSync(file, 'utf8');
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    const html = read('index.html');
    const history = JSON.parse(read('data/version_history.json'));
    const notice = JSON.parse(read('src/data/update-notice.json'));
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(html).toContain(`window.APP_VERSION = "${pkg.version}"`);
    const styles = [...html.matchAll(/style\.css\?v=([^"']+)/g)];
    expect(styles.length).toBeGreaterThan(0);
    styles.forEach(match => expect(match[1]).toBe(pkg.version));
    expect(history[0].fullVersion).toBe(`v${pkg.version} (${history[0].date})`);
    expect(read('CHANGELOG.md')).toContain(`## [${pkg.version}] - ${history[0].date}`);
    expect(notice.developerMessage).toContain(`v${pkg.version} 패치 업데이트입니다.`);
    expect(notice.summaryItems.length).toBeGreaterThan(0);
});
