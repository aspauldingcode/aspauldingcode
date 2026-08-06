---
title: apple-sharpener
order: 2
blurb: >-
  macOS Ammonia tweak for arbitrary window corner radii (including square and
  squircles). Widely used after Liquid Glass pushed system radii much larger.
years: 2024-present
images:
  - /applesharpener_slider/apple_sharpener_preview.jpg
imageAlts:
  - "macOS windows with apple-sharpener applying custom corner radii beside the default Liquid Glass look"
links:
  - label: GitHub
    href: https://github.com/aspauldingcode/apple-sharpener
---

apple-sharpener is a macOS Ammonia injection tweak that controls application window corner radius, including sharp square corners. It uses Objective-C runtime hooks and early injection, keeps system UI (menus, popovers, HUDs) intact, and exposes live CLI control with persisted state via notifyd.

Universal builds cover Intel and Apple Silicon. It is one of the more widely used projects in the modern macOS tweak ecosystem (300+ GitHub stars).

Interest jumped in 2026 when Apple shipped Liquid Glass and raised the default window corner radius to roughly 35 (from about 12). Users who disliked the new look, or the inconsistent radii across apps, turned to apple-sharpener for a fix. You can set any radius you want, including squircles for near-circular windows. Dock corner radius is configurable too, in a Hyprland-like spirit: edit `~/.config/sharpener/config.toml` and keep going.

It pairs especially well with tiling window managers such as yabai and Aerospace, where side-by-side BSP and autotiling layouts favor square windows and every pixel of usable space counts.
