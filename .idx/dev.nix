# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = with pkgs; [
    # Basics
    bash
    coreutils
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_20
    pkgs.nodePackages.nodemon
    pkgs.openssl
    pkgs.oh-my-zsh
    # dlib dependencies
    cmake
    #numpy dependencies
    gcc
    openblas
    lapack
    atlas
    glib
  ];

  services = {
    postgres = {
      enable = true;
      extensions = [ "pgvector" "postgis" ];
    };
    redis = {
      enable = true;
      port = 6379;
    };
  };

  # Sets environment variables in the workspace
  env = {
    PRISMA_CLIENT_ENGINE_TYPE = "binary";
    OPENSSL_VERSION = "openssl-1.1.x";
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # server = {
        #     command = [
        #       "npm"
        #       "run" "dev"
        #       "--"
        #       "--port" 
        #       "$PORT"
        #       "--host"
        #       "0.0.0.0"
        #     ];
        #     manager = "web";
        #     env = {
        #       PORT = "$PORT";
        #       "run"
        #       "dev"
        #       "--"
        #       "--port" 
        #       "$PORT"
        #       "--host"
        #       "0.0.0.0"
        #     ];
        #     manager = "web";
        #     env = {
        #       PORT = "$PORT";
        #     };
        #   cwd = "server"; #This needs to point to the server directory where your server package.json exists
        # };
        # web = {
        #   command = 
        #     [ "npm"
        #     "run" "dev"
        #     "--"
        #     "--port"
        #     "$PORT"
        #     "--host"
        #     "0.0.0.0"
        #   ];
        #   manager = "web";
        #   env = {
        #     PORT = "3000";
        #   };
        #   cwd = "client"; #This needs to point to the client directory where your client package.json exists
        # };
      };
    };
    # Workspace lifecycle hooks
    workspace = {

      # Runs when a workspace is first created or built
      onCreate = {
        # Install the Python packages and create the virtual env
        # https://nixos.org/manual/nixpkgs/stable/#python
        create-venv = ''
          echo "Creating Python virtual environment..."
          python3 -m venv venv
          source venv/bin/activate
          echo "Installing Python dependencies..."
          pip install -r requirements.txt
        '';
      };
      # Runs when the workspace is (re)started
      onStart = {
        # npm-watch-fe = "cd client && npm run start";
        # npm-watch-be = "cd server && npm run start";
        # files to open when the workspace is (re)opened.
        # default.openFiles = [ "src/index.ts" ];
      };
    };
  };
}
