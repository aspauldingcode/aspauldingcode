{
  description = "Build Alex Spaulding's resume using texliveFull";

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
          resume-runner = pkgs.writeShellApplication {
            name = "resume-runner";
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
                echo "Building resume..."
                if ! pdflatex -interaction=nonstopmode resume_alex_spaulding.tex; then
                  echo "pdflatex failed"
                  exit 1
                fi

                mkdir -p result
                if [ -f resume_alex_spaulding.pdf ]; then
                    mv -f resume_alex_spaulding.{pdf,aux,log,out} result/
                    echo "✅ Outputs moved to result/:"
                    echo "copying resume/result/resume_alex_spaulding.pdf to portfolio/public/resume_alex_spaulding.pdf"
                    cp result/resume_alex_spaulding.pdf ../portfolio/public/resume_alex_spaulding.pdf
                    ${open} result/resume_alex_spaulding.pdf
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