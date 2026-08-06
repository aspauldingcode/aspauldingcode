{
  description = "Portfolio and Resume development environment";

  outputs = { self, nixpkgs }:
    let
      systems = nixpkgs.lib.systems.flakeExposed;
    in
    {
      packages = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          portfolio = pkgs.buildNpmPackage {
            pname = "portfolio";
            version = "0.1.0";
            src = ./.;
            npmDepsHash = "sha256-dOE2srlnzJgqSp0SjAGX4Tgo77Odgv4A+UtnMj2HgIw=";
            
            npmFlags = [ "--legacy-peer-deps" ];

            # Next.js build needs this
            NEXT_TELEMETRY_DISABLED = 1;
            
            # Puppeteer needs Chrome/Chromium but Nix build is offline, and chromium is unsupported on macOS in nixpkgs.
            # We skip downloading it and disable the prebuild script during Nix build.
            PUPPETEER_SKIP_DOWNLOAD = "1";
            
            preBuild = ''
              # Remove prebuild script so it doesn't fail trying to run puppeteer without chrome
              npm pkg delete scripts.prebuild
            '';

            # Use specific Node.js version
            nodejs = pkgs.nodejs_22;
          };

          favicon-converter = pkgs.writeShellApplication {
            name = "favicon-converter";
            runtimeInputs = [ pkgs.imagemagick ];

            text = ''
              set -e
              
              # Define relative paths
              PUBLIC_DIR="public"
              PROFILE_SQUARE="$PUBLIC_DIR/profile_square.jpg"
              TEMP_FAVICON="$PUBLIC_DIR/favicon.jpg"
              FAVICON_ICO="$PUBLIC_DIR/favicon.ico"

              echo "Starting favicon conversion..."
              echo ""

              # Check if we're in the correct directory (should have public/ folder)
              if [ ! -d "$PUBLIC_DIR" ]; then
                echo "Error: public/ directory not found."
                echo "Please run this command from the portfolio root directory."
                exit 1
              fi

              # Check if profile_square.jpg exists
              if [ ! -f "$PROFILE_SQUARE" ]; then
                echo "Error: profile_square.jpg not found in $PUBLIC_DIR/"
                echo "Please make sure the file exists before running this script."
                exit 1
              fi

              echo "Found profile_square.jpg"

              # Step 1: Create a duplicate of profile_square.jpg
              echo "Created temporary favicon.jpg"

              # Step 2: Convert to .ico format with multiple sizes
              echo "Converting to favicon.ico..."
              magick "$TEMP_FAVICON" \
                \( -clone 0 -resize 16x16 \) \
                \( -clone 0 -resize 32x32 \) \
                \( -clone 0 -resize 48x48 \) \
                \( -clone 0 -resize 64x64 \) \
                \( -clone 0 -resize 128x128 \) \
                \( -clone 0 -resize 256x256 \) \
                -delete 0 "$FAVICON_ICO"

              echo "Converted to favicon.ico"
              echo "favicon.ico has been created/replaced"

              echo "Cleaning up..."
              rm -f "$TEMP_FAVICON"
              echo "Removed temporary favicon.jpg"

              echo "Favicon conversion completed."
            '';
          };

          dev = pkgs.writeShellApplication {
            name = "dev";
            runtimeInputs = [ pkgs.nodejs_22 pkgs.nodePackages_latest.vercel ];
            text = ''
              echo "Starting development server..."
              ENV_FILE=".env.vercel.development.local"
              vercel env pull "$ENV_FILE" --environment development --yes
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
            runtimeInputs = [ pkgs.nodePackages_latest.vercel ];
            text = ''
              vercel "$@"
            '';
          };
        }
      );

      apps = nixpkgs.lib.genAttrs systems (system:
        {
          default = {
            type    = "app";
            program = "${self.packages.${system}.dev}/bin/dev";
          };
          dev = {
            type    = "app";
            program = "${self.packages.${system}.dev}/bin/dev";
          };
          vercel = {
            type    = "app";
            program = "${self.packages.${system}.vercel}/bin/vercel";
          };
          favicon-converter = {
            type    = "app";
            program = "${self.packages.${system}.favicon-converter}/bin/favicon-converter";
          };
        }
      );

      devShells = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            buildInputs = [ 
              pkgs.imagemagick 
              pkgs.nodejs_22
              pkgs.nodePackages_latest.vercel
            ];
            
            shellHook = ''
              echo "Portfolio & Resume development shell"
              echo "Available commands:"
              echo "  - npm: Node.js package manager"
              echo "  - vercel: Vercel CLI"
              echo "  - magick: ImageMagick (used for favicon conversion)"
              echo ""
              echo "Run 'nix run' for the default development server."
            '';
          };
        }
      );
    };
}
