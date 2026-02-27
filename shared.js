// shared.js — locale-independent site logic for xiboplayer.org
// Call initSite(T) with a translations object to bootstrap.

function initSite(T) {

    // --- Tabs ---
    document.querySelectorAll('.tab-bar').forEach(function(bar) {
        bar.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function() {
                bar.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var parent = bar.parentElement;
                parent.querySelectorAll('.tab-content').forEach(function(tc) { tc.classList.remove('active'); });
                parent.querySelector('[data-tab-content="' + btn.dataset.tab + '"]').classList.add('active');
            });
        });
    });

    // --- OS tabs (Fedora / Ubuntu) inside deploy-package ---
    document.querySelectorAll('.deploy-os-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var os = btn.dataset.os;
            document.querySelectorAll('.deploy-os-tab').forEach(function(b) {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.opacity = '0.6';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--card-bg)';
            btn.style.opacity = '1';
            document.querySelectorAll('.deploy-os-content').forEach(function(c) { c.style.display = 'none'; });
            document.querySelector('[data-os-content="' + os + '"]').style.display = 'block';
        });
    });

    // --- Copy to clipboard ---
    window.copyCode = function(btn) {
        var pre = btn.closest('.setup-block').querySelector('pre');
        var text = pre.textContent;
        navigator.clipboard.writeText(text).then(function() {
            btn.textContent = T.copied;
            setTimeout(function() { btn.textContent = T.copy; }, 2000);
        });
    };

    // --- Sticky nav highlight ---
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav a');
    window.addEventListener('scroll', function() {
        var current = '';
        sections.forEach(function(s) {
            if (window.scrollY >= s.offsetTop - 80) current = s.id;
        });
        navLinks.forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
    });

    // --- Architecture filtering ---
    function renderArchFilter(filterEl, archs, activeArch, onSelect) {
        filterEl.innerHTML = '';
        archs.forEach(function(arch) {
            var btn = document.createElement('button');
            btn.textContent = arch;
            if (activeArch === arch) btn.classList.add('active');
            btn.onclick = function() { onSelect(arch); };
            filterEl.appendChild(btn);
        });
    }

    // --- DEB packages ---
    var debData = [];
    var debArch = 'amd64';

    function renderDebTable() {
        var el = document.getElementById('deb-list');
        var sorted = debData.slice().sort(function(a, b) { return (a.Package || '').localeCompare(b.Package || ''); });
        var filtered = debArch ? sorted.filter(function(p) { return p.Architecture === debArch || p.Architecture === 'all'; }) : sorted;
        if (filtered.length === 0) { el.innerHTML = '<p style="color:var(--gray-500)">' + T.noPackagesArch + '</p>'; return; }
        var html = '<table class="browse-table"><thead><tr><th>' + T.thPackage + '</th><th>' + T.thVersion + '</th><th>' + T.thArch + '</th><th>' + T.thSize + '</th><th>' + T.thDescription + '</th></tr></thead><tbody>';
        filtered.forEach(function(p) {
            var bytes = parseInt(p.Size) || 0;
            var size = !bytes ? '\u2014' : bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : (bytes / 1024).toFixed(1) + ' KB';
            var homepage = p.Homepage || '#';
            var desc = (p.Description || '').split('\n')[0];
            var note = p._releaseOnly ? ' <span class="badge" style="font-size:0.7em;">GitHub Release</span>' : '';
            html += '<tr><td><a href="' + homepage + '">' + (p.Package || '?') + '</a>' + note + '</td>' +
                '<td>' + (p.Version || '?') + '</td>' +
                '<td><span class="badge arch">' + (p.Architecture || '?') + '</span></td>' +
                '<td>' + size + '</td><td>' + desc + '</td></tr>';
        });
        el.innerHTML = html + '</tbody></table>';
    }

    function setupDebFilter() {
        var archs = ['amd64', 'arm64'];
        var filterEl = document.getElementById('deb-arch-filter');
        function update(arch) { debArch = arch; renderArchFilter(filterEl, archs, debArch, update); renderDebTable(); }
        renderArchFilter(filterEl, archs, debArch, update);
        renderDebTable();
    }

    async function loadDebPackages() {
        var el = document.getElementById('deb-list');
        try {
            var urls = ['/deb/ubuntu/24.04/all/Packages', '/deb/ubuntu/24.04/amd64/Packages', '/deb/ubuntu/24.04/arm64/Packages'];
            var pkgs = new Map();
            for (var i = 0; i < urls.length; i++) {
                var resp = await fetch(urls[i]);
                if (!resp.ok) continue;
                var text = await resp.text();
                if (!text.trim()) continue;
                text.trim().split('\n\n').forEach(function(block) {
                    var fields = {}, lastKey = '';
                    block.split('\n').forEach(function(line) {
                        if (line.startsWith(' ')) { if (lastKey) fields[lastKey] += '\n' + line; }
                        else { var idx = line.indexOf(': '); if (idx > 0) { lastKey = line.substring(0, idx); fields[lastKey] = line.substring(idx + 2); } }
                    });
                    var key = fields.Package + '-' + fields.Version + '-' + fields.Architecture;
                    if (!pkgs.has(key)) pkgs.set(key, fields);
                });
            }
            // Also fetch DEBs from GitHub Releases (packages too large for apt repo)
            var ghRepos = [{ name: 'xiboplayer-electron', repo: 'xibo-players/xiboplayer-electron' }];
            for (var j = 0; j < ghRepos.length; j++) {
                try {
                    var r = await fetch('https://api.github.com/repos/' + ghRepos[j].repo + '/releases/latest');
                    if (!r.ok) continue;
                    var rel = await r.json();
                    (rel.assets || []).filter(function(a) { return a.name.endsWith('.deb'); }).forEach(function(deb) {
                        var arch = deb.name.includes('_amd64') ? 'amd64' : deb.name.includes('_arm64') ? 'arm64' : 'all';
                        var ver = (rel.tag_name || '').replace(/^v/, '');
                        var key = ghRepos[j].name + '-' + ver + '-' + arch;
                        if (!pkgs.has(key)) pkgs.set(key, {
                            Package: ghRepos[j].name, Version: ver, Architecture: arch, Size: String(deb.size),
                            Homepage: 'https://github.com/' + ghRepos[j].repo,
                            Description: 'Electron-based Xibo player (install from GitHub Releases)', _releaseOnly: true
                        });
                    });
                } catch (e) { /* skip */ }
            }
            debData = Array.from(pkgs.values());
            if (debData.length === 0) { el.innerHTML = '<p style="color:var(--gray-500)">' + T.noDebPackages + '</p>'; return; }
            setupDebFilter();
        } catch (e) {
            el.innerHTML = '<p style="color:var(--gray-500)">' + T.errorDebPackages + '</p>';
        }
    }

    // --- RPM packages ---
    var rpmData = [];
    var rpmArch = 'x86_64';

    function renderRpmTable() {
        var el = document.getElementById('rpm-list');
        var sorted = rpmData.slice().sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
        var filtered = rpmArch ? sorted.filter(function(p) { return p.arch === rpmArch || p.arch === 'noarch'; }) : sorted;
        if (filtered.length === 0) { el.innerHTML = '<p style="color:var(--gray-500)">' + T.noPackagesArch + '</p>'; return; }
        var html = '<table class="browse-table"><thead><tr><th>' + T.thPackage + '</th><th>' + T.thFile + '</th><th>' + T.thSize + '</th><th>' + T.thArch + '</th><th>' + T.thRelease + '</th></tr></thead><tbody>';
        filtered.forEach(function(r) {
            html += '<tr><td><a href="https://github.com/' + r.repo + '">' + r.name + '</a></td>' +
                '<td><a href="' + r.url + '">' + r.file + '</a></td>' +
                '<td>' + r.size + '</td><td><span class="badge arch">' + r.arch + '</span></td>' +
                '<td><a href="' + r.releaseUrl + '">' + r.tag + '</a></td></tr>';
        });
        el.innerHTML = html + '</tbody></table>';
    }

    function setupRpmFilter() {
        var archs = ['x86_64', 'aarch64'];
        var filterEl = document.getElementById('rpm-arch-filter');
        function update(arch) { rpmArch = arch; renderArchFilter(filterEl, archs, rpmArch, update); renderRpmTable(); }
        renderArchFilter(filterEl, archs, rpmArch, update);
        renderRpmTable();
    }

    async function loadRpmPackages() {
        var el = document.getElementById('rpm-list');
        var repos = [
            { name: 'xiboplayer-kiosk', repo: 'xibo-players/xiboplayer-kiosk' },
            { name: 'xiboplayer-electron', repo: 'xibo-players/xiboplayer-electron' },
            { name: 'xiboplayer-chromium', repo: 'xibo-players/xiboplayer-chromium' },
            { name: 'arexibo', repo: 'xibo-players/arexibo' },
        ];
        for (var i = 0; i < repos.length; i++) {
            try {
                var resp = await fetch('https://api.github.com/repos/' + repos[i].repo + '/releases/latest');
                if (!resp.ok) continue;
                var release = await resp.json();
                (release.assets || []).filter(function(a) { return a.name.endsWith('.rpm'); }).forEach(function(rpm) {
                    var arch = rpm.name.includes('.x86_64.') ? 'x86_64' : rpm.name.includes('.aarch64.') ? 'aarch64' : rpm.name.includes('.noarch.') ? 'noarch' : '?';
                    var rpmSize = rpm.size > 1048576 ? (rpm.size / 1048576).toFixed(1) + ' MB' : (rpm.size / 1024).toFixed(0) + ' KB';
                    var verRel = rpm.name.replace(/\.[^.]+\.rpm$/, '').replace(/\.fc\d+$/, '').replace(/^.*?-(\d)/, '$1');
                    rpmData.push({ name: repos[i].name, repo: repos[i].repo, file: rpm.name, url: rpm.browser_download_url, size: rpmSize, arch: arch, tag: verRel, releaseUrl: release.html_url });
                });
            } catch (e) { /* skip */ }
        }
        if (rpmData.length === 0) { el.innerHTML = '<p style="color:var(--gray-500)">' + T.noRpmReleases + '</p>'; return; }
        setupRpmFilter();
    }

    // --- Theme toggle ---
    window.toggleTheme = function() {
        var html = document.documentElement;
        var current = html.getAttribute('data-theme');
        var next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateToggleIcon(next);
    };
    function updateToggleIcon(theme) {
        var btn = document.querySelector('.theme-toggle');
        if (btn) btn.innerHTML = theme === 'dark' ? '&#x2600;' : '&#x1F319;';
    }
    // Init theme: saved preference > system preference > light
    (function() {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = saved || (prefersDark ? 'dark' : 'light');
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        updateToggleIcon(theme);
    })();

    // --- Kiosk images ---
    async function loadKioskImages() {
        var el = document.getElementById('images-list');
        try {
            var resp = await fetch('https://api.github.com/repos/xibo-players/xiboplayer-kiosk/releases/latest');
            if (!resp.ok) throw new Error('No release');
            var release = await resp.json();
            var images = (release.assets || []).filter(function(a) {
                return a.name.endsWith('.iso') || a.name.endsWith('.qcow2') || a.name.endsWith('.raw.xz') || a.name.endsWith('.xz');
            });
            if (images.length === 0) {
                el.innerHTML = '<div class="pkg-grid">' +
                    '<div class="pkg-card bg-white dark:bg-gray-800" style="cursor:default;"><h3>' + T.noImagesYet + '</h3>' +
                    '<p class="desc">' + T.noImagesDesc + '</p></div></div>';
                return;
            }
            var html = '<table class="browse-table"><thead><tr><th>' + T.thImage + '</th><th>' + T.thFormat + '</th><th>' + T.thUseCase + '</th><th>' + T.thSize + '</th><th>' + T.thArch + '</th><th>' + T.thRelease + '</th></tr></thead><tbody>';
            for (var i = 0; i < images.length; i++) {
                var img = images[i];
                var size = img.size > 1073741824 ? (img.size / 1073741824).toFixed(1) + ' GB' : img.size > 1048576 ? (img.size / 1048576).toFixed(0) + ' MB' : (img.size / 1024).toFixed(0) + ' KB';
                var arch = img.name.includes('x86_64') ? 'x86_64'
                    : img.name.includes('aarch64') ? 'aarch64' : '\u2014';
                var isIso = img.name.endsWith('.iso');
                var isQcow = img.name.endsWith('.qcow2');
                var isRaw = img.name.endsWith('.raw.xz');
                var isArm = img.name.includes('aarch64');
                var fmt = isIso ? T.fmtIso
                    : isQcow ? T.fmtQcow2
                    : isRaw ? T.fmtRaw
                    : img.name.endsWith('.xz') ? T.fmtCompressed : T.fmtImage;
                var useCase = isIso ? T.useCaseIso
                    : isQcow ? T.useCaseQcow2
                    : (isRaw && isArm) ? T.useCaseRawArm
                    : isRaw ? T.useCaseRawX86
                    : '';
                html += '<tr>' +
                    '<td><a href="' + img.browser_download_url + '">' + img.name + '</a></td>' +
                    '<td>' + fmt + '</td>' +
                    '<td style="color:var(--gray-500);font-size:0.85em;">' + useCase + '</td>' +
                    '<td>' + size + '</td>' +
                    '<td><span class="badge arch">' + arch + '</span></td>' +
                    '<td><a href="' + release.html_url + '">' + release.tag_name + '</a></td>' +
                    '</tr>';
            }
            html += '</tbody></table>';
            html += '<div style="margin-top:16px; font-size:0.85em; color:var(--gray-500);">' +
                '<p>' + T.imagesNote + '</p>' +
                '<p style="margin-top:6px;">' + T.imagesEtcher + '</p>' +
                '</div>';
            el.innerHTML = html;
        } catch (e) {
            el.innerHTML = '<div class="pkg-grid">' +
                '<div class="pkg-card bg-white dark:bg-gray-800" style="cursor:default;"><h3>' + T.kioskImages + '</h3>' +
                '<p class="desc">' + T.imagesFallback + '</p></div></div>';
        }
    }

    // --- Load everything ---
    loadDebPackages();
    loadRpmPackages();
    loadKioskImages();
}
