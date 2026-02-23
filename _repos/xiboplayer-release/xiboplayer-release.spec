Name:           xiboplayer-release
Version:        43
Release:        1%{?dist}
Summary:        Xibo Players repository configuration
License:        MIT
URL:            https://dl.xiboplayer.org
BuildArch:      noarch

Source0:        xiboplayer.repo
Source1:        RPM-GPG-KEY-xiboplayer

%description
This package contains the Xibo Players repository configuration
for DNF and the GPG key used to sign packages.

%install
install -d %{buildroot}%{_sysconfdir}/yum.repos.d
install -d %{buildroot}%{_sysconfdir}/pki/rpm-gpg

install -pm 0644 %{SOURCE0} %{buildroot}%{_sysconfdir}/yum.repos.d/xiboplayer.repo
install -pm 0644 %{SOURCE1} %{buildroot}%{_sysconfdir}/pki/rpm-gpg/RPM-GPG-KEY-xiboplayer

%files
%{_sysconfdir}/yum.repos.d/xiboplayer.repo
%{_sysconfdir}/pki/rpm-gpg/RPM-GPG-KEY-xiboplayer
