{
  description = "Build Alex Spaulding's resume using texliveFull";

  outputs = { self, nixpkgs }:
    let
      systems = nixpkgs.lib.systems.flakeExposed;
    in
    {
      lib = {
        # A helper function that other flakes can use to build LaTeX files
        # with the same dependencies used by aspauldingcode resumes.
        buildTex = { pkgs, name, src, dst ? "${name}.pdf" }: pkgs.stdenvNoCC.mkDerivation {
          inherit name src;
          buildInputs = [ pkgs.texliveFull ];
          phases = [ "unpackPhase" "buildPhase" "installPhase" ];
          unpackPhase = ''
            cp $src ./source.tex
          '';
          buildPhase = ''
            pdflatex -interaction=nonstopmode source.tex
          '';
          installPhase = ''
            mkdir -p $out
            cp source.pdf $out/${dst}
          '';
        };
      };

      templates = {
        resume = {
          path = ./.;
          description = "Alex Spaulding's Resume and Cover Letter templates";
        };
      };

      packages = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = import nixpkgs { inherit system; };

          ats-scanner = pkgs.writeShellApplication {
            name = "ats-scanner";
            runtimeInputs = [
              pkgs.poppler-utils
              pkgs.gawk
              pkgs.gnugrep
              pkgs.gnused
              pkgs.coreutils
            ];
            text = builtins.readFile ./ats-scan.sh;
          };
        in
        {
          inherit ats-scanner;

          resume-runner = pkgs.writeShellApplication {
            name = "resume-runner";
            runtimeInputs = [ pkgs.texliveFull pkgs.poppler-utils ats-scanner ];

            text = let
              open =
                if pkgs.stdenv.isDarwin then
                  "open"
                else if pkgs.stdenv.isLinux then
                  "xdg-open"
                else
                  throw "Unsupported OS";
              in ''
                set -e
                echo "Building resume..."
                if ! pdflatex -interaction=nonstopmode resume_alex_spaulding.tex; then
                  echo "pdflatex failed"
                  exit 1
                fi

                mkdir -p result
                if [ -f resume_alex_spaulding.pdf ]; then
                    mv -f resume_alex_spaulding.{pdf,aux,log,out} result/
                    echo "Moved outputs to result/"

                    ats-scanner result/resume_alex_spaulding.pdf

                    cp result/resume_alex_spaulding.pdf ../portfolio/public/resume_alex_spaulding.pdf
                    ${open} result/resume_alex_spaulding.pdf
                else
                    echo "Error: PDF not generated."
                    exit 1
                fi
              '';
          };

          cover-letter-runner = pkgs.writeShellApplication {
            name = "cover-letter-runner";
            runtimeInputs = [ pkgs.texliveFull ];

            text = let
              open =
                if pkgs.stdenv.isDarwin then
                  "open"
                else if pkgs.stdenv.isLinux then
                  "xdg-open"
                else
                  throw "Unsupported OS";
              in ''
                set -e
                echo "Building cover letter..."
                if ! pdflatex -interaction=nonstopmode cover_letter_alex_spaulding.tex; then
                  echo "pdflatex failed"
                  exit 1
                fi

                mkdir -p result
                if [ -f cover_letter_alex_spaulding.pdf ]; then
                    mv -f cover_letter_alex_spaulding.{pdf,aux,log,out} result/
                    echo "Moved outputs to result/"
                    # We don't upload the cover letter to the portfolio
                    ${open} result/cover_letter_alex_spaulding.pdf
                else
                    echo "Error: PDF not generated."
                    exit 1
                fi
              '';
          };
        }
      );

      apps = nixpkgs.lib.genAttrs systems (system:
        {
          default = {
            type    = "app";
            program = "${self.packages.${system}.resume-runner}/bin/resume-runner";
          };
          cover-letter = {
            type    = "app";
            program = "${self.packages.${system}.cover-letter-runner}/bin/cover-letter-runner";
          };
          ats-scan = {
            type    = "app";
            program = "${self.packages.${system}.ats-scanner}/bin/ats-scanner";
          };
        }
      );

      devShells = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            buildInputs = [ pkgs.texliveFull ];
          };
        }
      );
    };
}