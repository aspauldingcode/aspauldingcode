---
title: Wawona
order: 1
blurb: >-
  Native Wayland compositor for macOS, iOS, and Android: nested Linux desktops,
  Waypipe, and on-device shell.
years: 2025-present
images:
  - /wawona_slider/wawona_nested_plasma.jpg
  - /wawona_slider/wawona_nested_xfce.jpg
  - /wawona_slider/wawona_nested_cosmic.jpg
  - /wawona_slider/wawona-macos_weston.jpg
  - /wawona_slider/wawona-ios-sway_landscape.jpg
  - /wawona_slider/wawona-android-sway_landscape.jpg
imageAlts:
  - "Wawona nesting a KDE Plasma Linux desktop session on macOS"
  - "Wawona nesting an XFCE Linux desktop session on macOS"
  - "Wawona nesting a COSMIC Linux desktop session on macOS"
  - "Wawona running Weston Wayland compositor natively on macOS"
  - "Wawona running sway in landscape on iOS"
  - "Wawona running sway in landscape on Android"
links:
  - label: GitHub
    href: https://github.com/Wawona/Wawona
  - label: wawona.io
    href: https://wawona.io
---

Wawona is a native Wayland compositor for macOS, iOS, and Android. It is not a virtual machine and not a remote-desktop wrapper: a shared Rust core composites Wayland clients with Metal and Vulkan backends, UniFFI bridges to platform UI, and a Nix-based cross-compile toolchain across the Wawona org (`wwn-*` ports for graphics, shell, SSH, and more).

You can nest full Linux desktops (Plasma, XFCE, COSMIC, sway, niri), forward remote apps with Waypipe, and run App Store-oriented on-device shell and userland work. Founded and led by Alex Spaulding. Open source under MIT.
