# Alex Spaulding's Resume

This directory contains a Nix flake that builds the LaTeX resume into a PDF and copies it to the portfolio site for easy publishing.

## Quick Start

- Build the resume: `nix run`
  - Runs a small shell app that invokes `pdflatex` in a reproducible `texliveFull` environment.
  - Moves outputs to `result/` and copies the PDF to `../portfolio/public/resume_alex_spaulding.pdf`.
  - Opens the generated PDF (`open` on macOS, `xdg-open` on Linux).

- Build the cover letter: `nix run .#cover-letter`
  - Specifically handles the cover letter template.
  - Moves outputs to `result/cover_letter_alex_spaulding.pdf`.
  - Does **not** copy to the portfolio site (private/custom per application).
  - Opens the generated PDF.

- Dev shell: `nix develop`
  - Drops you into a shell with `texliveFull` available for ad‑hoc LaTeX work, e.g.: `pdflatex -interaction=nonstopmode resume_alex_spaulding.tex`.

## Flake Structure

- `packages.resume-runner` / `packages.cover-letter-runner`
  - Defined via `pkgs.writeShellApplication` with `runtimeInputs = [ pkgs.texliveFull ]`.
  - Scripts build the `.tex` files and stage artifacts into `result/`.

- `apps.default`
  - Points to the `resume-runner` binary.

- `apps.cover-letter`
  - Points to the `cover-letter-runner` binary.

- `devShells.default`
  - Provides `texliveFull` in an interactive shell for editing and testing.

- `flake.lock`
  - Pins `nixpkgs` for reproducible builds across machines and CI.

## Why Nix / nixpkgs / flakes

- Reproducibility: `flake.lock` ensures the same `texliveFull` and tooling everywhere.
- Single command UX: `nix run` encapsulates build, staging, copy-to-portfolio, and open.
- Clean DevOps: No global TeX installs; everything is pulled from `nixpkgs` on demand.

## Using as a Flake Module

The `aspauldingcode` resume directory exports itself as a Nix flake module, allowing you to use its templates and build environment in your own private repositories without modifying the original code.

### 1. Initialize from Template

Create a new directory for your private resumes and run:
`nix flake init -t github:aspauldingcode/aspauldingcode?dir=resume#resume`

This will copy the `resume_alex_spaulding.tex` and `cover_letter_alex_spaulding.tex` files, which you can then customize.

### 2. Import the Builder into Your Flake

In your private repository's `flake.nix`, import this repository as an input and use the `aspauldingcode.lib.buildTex` builder:

```nix
{
  description = "My Private Resumes";

  inputs = {
    aspauldingcode.url = "github:aspauldingcode/aspauldingcode?dir=resume";
    nixpkgs.follows = "aspauldingcode/nixpkgs"; # Avoid rebuilding texlive
  };

  outputs = { self, nixpkgs, aspauldingcode }:

    let
      system = "aarch64-darwin"; # Set your architecture
      pkgs = import nixpkgs { inherit system; };
      
      # Use the exported helper to build your custom file!
      my-cover-letter = aspauldingcode.lib.buildTex {
        inherit pkgs;
        name = "private-cover-letter";
        src = ./my-custom-cover-letter.tex; # Your private modified template
      };
    in
    {
      packages.${system}.default = my-cover-letter;
    };
}
```

Now you can run `nix build` in your private repository to get your customized PDF, built via the same robust `texliveFull` setup used here.

## Artifacts

- Built PDF: `result/resume_alex_spaulding.pdf`
- Published copy (for the portfolio site): `../portfolio/public/resume_alex_spaulding.pdf`