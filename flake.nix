{
  description = "Portfolio development environment";

  outputs = { self, nixpkgs }:
    let
      systems = nixpkgs.lib.systems.flakeExposed;
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      packages = forAllSystems (pkgs: {
        favicon-converter = pkgs.writeShellApplication {
          name = "favicon-converter";
          runtimeInputs = [ pkgs.imagemagick ];
          text = ''
            set -euo pipefail
            PUBLIC_DIR="public"
            SRC="$PUBLIC_DIR/profile_square.jpg"
            OUT="$PUBLIC_DIR/favicon.ico"

            if [ ! -d "$PUBLIC_DIR" ]; then
              echo "Error: public/ directory not found. Run from the portfolio root." >&2
              exit 1
            fi
            if [ ! -f "$SRC" ]; then
              echo "Error: $SRC not found." >&2
              exit 1
            fi

            magick "$SRC" \
              \( -clone 0 -resize 16x16 \) \
              \( -clone 0 -resize 32x32 \) \
              \( -clone 0 -resize 48x48 \) \
              \( -clone 0 -resize 64x64 \) \
              \( -clone 0 -resize 128x128 \) \
              \( -clone 0 -resize 256x256 \) \
              -delete 0 "$OUT"

            echo "Wrote $OUT"
          '';
        };

        dev = pkgs.writeShellApplication {
          name = "dev";
          runtimeInputs = [ pkgs.nodejs_22 ];
          text = ''
            set -euo pipefail
            echo "Starting development server..."
            if [ ! -d node_modules ]; then
              npm install
            fi
            ENV_FILE=".env.vercel.development.local"
            if command -v npx >/dev/null 2>&1; then
              npx vercel env pull "$ENV_FILE" --environment development --yes || true
            fi
            if [ -f "$ENV_FILE" ]; then
              set -a
              # shellcheck source=/dev/null
              . "$ENV_FILE"
              set +a
            fi
            npm run dev
          '';
        };

        vercel = pkgs.writeShellApplication {
          name = "vercel";
          runtimeInputs = [ pkgs.nodejs_22 ];
          text = ''
            set -euo pipefail
            if [ ! -d node_modules ]; then
              npm install
            fi
            exec npx vercel "$@"
          '';
        };
      });

      apps = nixpkgs.lib.genAttrs systems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.dev}/bin/dev";
        };
        dev = {
          type = "app";
          program = "${self.packages.${system}.dev}/bin/dev";
        };
        vercel = {
          type = "app";
          program = "${self.packages.${system}.vercel}/bin/vercel";
        };
        favicon-converter = {
          type = "app";
          program = "${self.packages.${system}.favicon-converter}/bin/favicon-converter";
        };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          buildInputs = [
            pkgs.imagemagick
            pkgs.nodejs_22
          ];
          shellHook = ''
            echo "Portfolio development shell"
            echo "  npm / npx vercel / magick"
            echo "  nix run .#dev"
          '';
        };
      });
    };
}
