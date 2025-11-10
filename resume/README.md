# Alex Spaulding's Resume

This directory contains a Nix flake that builds the LaTeX resume into a PDF and copies it to the portfolio site for easy publishing.

## Quick Start

- Build the PDF: `nix run`
  - Runs a small shell app that invokes `pdflatex` in a reproducible `texliveFull` environment.
  - Moves outputs to `result/` and copies the PDF to `../portfolio/public/resume_alex_spaulding.pdf`.
  - Opens the generated PDF (`open` on macOS, `xdg-open` on Linux).

- Dev shell: `nix develop`
  - Drops you into a shell with `texliveFull` available for ad‑hoc LaTeX work, e.g.: `pdflatex -interaction=nonstopmode resume_alex_spaulding.tex`.

## Flake Structure

- `packages.resume-runner`
  - Defined via `pkgs.writeShellApplication` with `runtimeInputs = [ pkgs.texliveFull ]`.
  - Script builds the `.tex`, stages artifacts into `result/`, and copies to the portfolio `public/` dir.

- `apps.default`
  - Points to the `resume-runner` binary, enabling `nix run` to build and open the PDF.

- `devShells.default`
  - Provides `texliveFull` in an interactive shell for editing and testing.

- `flake.lock`
  - Pins `nixpkgs` for reproducible builds across machines and CI.

## Why Nix / nixpkgs / flakes

- Reproducibility: `flake.lock` ensures the same `texliveFull` and tooling everywhere.
- Single command UX: `nix run` encapsulates build, staging, copy-to-portfolio, and open.
- Clean DevOps: No global TeX installs; everything is pulled from `nixpkgs` on demand.

## Notes & Learning

- This flake is part of my broader Nix and DevOps workflow.
- I’ve learned a lot about Nix language, flakes, `nixpkgs`, and reproducible environments through my dotfiles and system setup work: https://github.com/aspauldingcode/.dotfiles
- The pattern here (shell app + `apps.default` + `devShell`) is a repeatable way to wrap build tools for other projects.

## Artifacts

- Built PDF: `result/resume_alex_spaulding.pdf`
- Published copy (for the portfolio site): `../portfolio/public/resume_alex_spaulding.pdf`