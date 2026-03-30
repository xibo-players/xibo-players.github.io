Name:           xiboplayer-release
Version:        %{_version}
Release:        2
Summary:        Xibo Players repository configuration
License:        MIT
URL:            https://dl.xiboplayer.org
BuildArch:      noarch

Source0:        xiboplayer.repo
Source1:        RPM-GPG-KEY-xiboplayer
Source2:        copr-keyd.repo

%description
This package contains the Xibo Players repository configuration
for DNF and the GPG key used to sign packages.

%install
install -d %{buildroot}%{_sysconfdir}/yum.repos.d
install -d %{buildroot}%{_sysconfdir}/pki/rpm-gpg

install -pm 0644 %{SOURCE0} %{buildroot}%{_sysconfdir}/yum.repos.d/xiboplayer.repo
install -pm 0644 %{SOURCE1} %{buildroot}%{_sysconfdir}/pki/rpm-gpg/RPM-GPG-KEY-xiboplayer
install -pm 0644 %{SOURCE2} %{buildroot}%{_sysconfdir}/yum.repos.d/copr-keyd.repo

%files
%{_sysconfdir}/yum.repos.d/xiboplayer.repo
%{_sysconfdir}/yum.repos.d/copr-keyd.repo
%{_sysconfdir}/pki/rpm-gpg/RPM-GPG-KEY-xiboplayer

%changelog
* Mon Mar 30 2026 Pau Aliagas <linuxnow@gmail.com> - 44-2
- Include keyd COPR repo so dnf can resolve keyd dependency

* Tue Feb 25 2026 Pau Aliagas <linuxnow@gmail.com> - 43-5
- GPG-sign RPM in CI workflow

* Tue Feb 25 2026 Pau Aliagas <linuxnow@gmail.com> - 43-4
- Build via GitHub Releases instead of committing to repo

* Tue Feb 25 2026 Pau Aliagas <linuxnow@gmail.com> - 43-3
- Add source repo config (SRPMs + deb-src)

* Sun Feb 23 2026 Pau Aliagas <linuxnow@gmail.com> - 43-2
- Update repository URL from dnf.xiboplayer.org to dl.xiboplayer.org

* Sat Feb 22 2026 Pau Aliagas <linuxnow@gmail.com> - 43-1
- Initial xiboplayer-release package with repo config and GPG key
