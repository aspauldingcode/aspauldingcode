{
  description = "Convert profile_square.jpg to favicon.ico using ImageMagick";

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

              echo "🚀 Starting favicon conversion process using Nix flake..."
              echo ""

              # Check if we're in the correct directory (should have public/ folder)
              if [ ! -d "$PUBLIC_DIR" ]; then
                echo "❌ Error: public/ directory not found."
                echo "Please run this command from the portfolio root directory."
                exit 1
              fi

              # Check if profile_square.jpg exists
              if [ ! -f "$PROFILE_SQUARE" ]; then
                echo "❌ Error: profile_square.jpg not found in $PUBLIC_DIR/"
                echo "Please make sure the file exists before running this script."
                exit 1
              fi

              echo "✅ Found profile_square.jpg"

              # Step 1: Create a duplicate of profile_square.jpg
              echo "📋 Step 1: Creating duplicate of profile_square.jpg..."
              cp "$PROFILE_SQUARE" "$TEMP_FAVICON"
              echo "✅ Created temporary favicon.jpg"

              # Step 2: Convert to .ico format with multiple sizes
              echo "🔄 Step 2: Converting to favicon.ico with multiple sizes..."
              magick "$TEMP_FAVICON" \
                \( -clone 0 -resize 16x16 \) \
                \( -clone 0 -resize 32x32 \) \
                \( -clone 0 -resize 48x48 \) \
                \( -clone 0 -resize 64x64 \) \
                \( -clone 0 -resize 128x128 \) \
                \( -clone 0 -resize 256x256 \) \
                -delete 0 "$FAVICON_ICO"

              echo "✅ Converted to favicon.ico with multiple sizes"

              # Step 3: Favicon is already replaced in the previous step
              echo "✅ Step 3: favicon.ico has been created/replaced"

              # Step 4: Remove the temporary duplicate
              echo "🧹 Step 4: Cleaning up temporary files..."
              rm -f "$TEMP_FAVICON"
              echo "✅ Removed temporary favicon.jpg"

              echo ""
              echo "🎉 Favicon conversion completed successfully!"
              echo "📁 Your files:"
              echo "   ✅ profile_square.jpg - still available"
              echo "   ✅ profile_regular.jpg - still available"
              echo "   ✅ favicon.ico - updated with your profile photo"
              echo ""
              echo "🌐 The new favicon should appear in your browser after a refresh or cache clear."
              echo ""
              echo "💡 To use the new favicon, run: nix run .#favicon-converter"
            '';
          };
        }
      );

      apps = nixpkgs.lib.genAttrs systems (system:
        {
          default = {
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
            buildInputs = [ pkgs.imagemagick ];
          };
        }
      );
    };
}