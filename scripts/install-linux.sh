#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="LuftFixed"
APP_BINARY="luftfixed"
REPO_URL="${LUFTFIXED_REPO_URL:-https://github.com/tugrakaymakcioglu/LuftFixed.git}"
SOURCE_DIR="${LUFTFIXED_SOURCE_DIR:-$HOME/.local/share/luftfixed/source}"
LOCAL_PREFIX="${LUFTFIXED_PREFIX:-$HOME/.local}"
DESKTOP_FILE_NAME="luftfixed.desktop"

log() {
  printf '\n==> %s\n' "$*"
}

warn() {
  printf '\nUYARI: %s\n' "$*" >&2
}

die() {
  printf '\nHATA: %s\n' "$*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

apt_package_available() {
  apt-cache show "$1" >/dev/null 2>&1
}

install_apt_polkit() {
  local packages=()

  if apt_package_available pkexec; then
    packages+=(pkexec)
  fi

  if apt_package_available polkitd; then
    packages+=(polkitd)
  fi

  if [ "${#packages[@]}" -eq 0 ] && apt_package_available policykit-1; then
    packages+=(policykit-1)
  fi

  if [ "${#packages[@]}" -gt 0 ]; then
    as_root apt-get install -y "${packages[@]}"
  else
    warn "Polkit/pkexec paketi otomatik bulunamadi; yonetici yetkisi gerektiren islemler icin pkexec gerekebilir."
  fi
}

require_linux() {
  [ "$(uname -s)" = "Linux" ] || die "Bu kurulum komutu Linux masaustu sistemleri icindir."
  [ -r /etc/os-release ] || die "/etc/os-release okunamadi; dagitim algilanamadi."
  have sudo || [ "$(id -u)" -eq 0 ] || die "sudo bulunamadi. Paket kurulumu icin sudo gerekli."
}

load_os_release() {
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_LIKE="${ID_LIKE:-}"
  OS_PRETTY="${PRETTY_NAME:-$OS_ID}"
}

detect_package_family() {
  local hint=" $OS_ID $OS_LIKE "

  if have apt-get || [[ "$hint" == *" debian "* ]] || [[ "$hint" == *" ubuntu "* ]]; then
    PACKAGE_FAMILY="apt"
    BUNDLE_KIND="deb"
  elif have dnf || [[ "$hint" == *" fedora "* ]] || [[ "$hint" == *" rhel "* ]]; then
    PACKAGE_FAMILY="dnf"
    BUNDLE_KIND="rpm"
  elif have zypper || [[ "$hint" == *" suse "* ]]; then
    PACKAGE_FAMILY="zypper"
    BUNDLE_KIND="rpm"
  elif have pacman || [[ "$hint" == *" arch "* ]]; then
    PACKAGE_FAMILY="pacman"
    BUNDLE_KIND="local"
  elif have apk || [[ "$hint" == *" alpine "* ]]; then
    PACKAGE_FAMILY="apk"
    BUNDLE_KIND="local"
  else
    die "Desteklenen paket yoneticisi algilanamadi. apt, dnf, zypper, pacman veya apk gerekli."
  fi
}

install_system_dependencies() {
  log "$OS_PRETTY icin sistem bagimliliklari kuruluyor"

  case "$PACKAGE_FAMILY" in
    apt)
      as_root apt-get update
      as_root apt-get install -y \
        git \
        curl \
        wget \
        file \
        build-essential \
        nodejs \
        npm \
        libwebkit2gtk-4.1-dev \
        libxdo-dev \
        libssl-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev
      install_apt_polkit
      ;;
    dnf)
      as_root dnf check-update || true
      as_root dnf install -y \
        git \
        curl \
        wget \
        file \
        nodejs \
        npm \
        polkit \
        webkit2gtk4.1-devel \
        openssl-devel \
        libappindicator-gtk3-devel \
        librsvg2-devel \
        libxdo-devel
      as_root dnf group install -y c-development
      ;;
    zypper)
      as_root zypper --non-interactive refresh
      as_root zypper --non-interactive update
      as_root zypper --non-interactive install \
        git \
        nodejs \
        npm \
        polkit \
        webkit2gtk3-devel \
        libopenssl-devel \
        curl \
        wget \
        file \
        libappindicator3-1 \
        librsvg-devel
      as_root zypper --non-interactive install -t pattern devel_basis
      ;;
    pacman)
      as_root pacman -Syu --needed --noconfirm \
        git \
        nodejs \
        npm \
        rustup \
        polkit \
        webkit2gtk-4.1 \
        base-devel \
        curl \
        wget \
        file \
        openssl \
        appmenu-gtk-module \
        libappindicator-gtk3 \
        librsvg \
        xdotool
      ;;
    apk)
      as_root apk update
      as_root apk add \
        git \
        nodejs \
        npm \
        build-base \
        webkit2gtk-4.1-dev \
        curl \
        wget \
        file \
        openssl \
        polkit \
        libayatana-appindicator-dev \
        librsvg \
        font-dejavu
      ;;
  esac
}

ensure_rust() {
  if ! have rustup; then
    log "Rust toolchain kuruluyor"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  fi

  # shellcheck disable=SC1091
  [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

  if ! rustup show active-toolchain >/dev/null 2>&1; then
    rustup default stable
  fi

  have cargo || die "cargo bulunamadi. Terminali kapatip tekrar acarak scripti yeniden calistir."
}

ensure_node_version() {
  have node || die "node bulunamadi."
  have npm || die "npm bulunamadi."

  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || printf '0')"

  if [ "$major" -lt 18 ]; then
    die "Node.js 18 veya ustu gerekli. Dagitimin nodejs paketi eski geldi; Node.js LTS kurup scripti tekrar calistir."
  fi
}

sync_source() {
  log "LuftFixed kaynak kodu hazirlaniyor"
  mkdir -p "$(dirname "$SOURCE_DIR")"

  if [ -d "$SOURCE_DIR/.git" ]; then
    git -C "$SOURCE_DIR" pull --ff-only
  else
    rm -rf "$SOURCE_DIR"
    git clone "$REPO_URL" "$SOURCE_DIR"
  fi

  cd "$SOURCE_DIR"
}

build_app() {
  log "Bagimliliklar yukleniyor ve proje dogrulaniyor"
  npm ci
  npm run verify

  log "Native masaustu paketi uretiliyor"
  case "$BUNDLE_KIND" in
    deb)
      npm run tauri -- build --bundles deb
      ;;
    rpm)
      npm run tauri -- build --bundles rpm
      ;;
    local)
      npm run tauri -- build --no-bundle
      ;;
  esac
}

newest_file() {
  find "$1" -type f -name "$2" -print 2>/dev/null | sort | tail -n 1
}

install_package_or_binary() {
  case "$BUNDLE_KIND" in
    deb)
      local deb
      deb="$(newest_file "src-tauri/target/release/bundle/deb" "*.deb")"
      [ -n "$deb" ] || die ".deb paketi bulunamadi."
      log "$deb kuruluyor"
      as_root apt-get install -y "./$deb"
      APP_EXEC="$APP_BINARY"
      ;;
    rpm)
      local rpm
      rpm="$(newest_file "src-tauri/target/release/bundle/rpm" "*.rpm")"
      [ -n "$rpm" ] || die ".rpm paketi bulunamadi."
      log "$rpm kuruluyor"
      if [ "$PACKAGE_FAMILY" = "zypper" ]; then
        as_root zypper --non-interactive install "./$rpm"
      else
        as_root dnf install -y "./$rpm"
      fi
      APP_EXEC="$APP_BINARY"
      ;;
    local)
      log "Yerel kullanici kurulumu yapiliyor"
      mkdir -p "$LOCAL_PREFIX/bin" "$LOCAL_PREFIX/share/applications" "$LOCAL_PREFIX/share/icons/hicolor/128x128/apps"
      install -m 0755 "src-tauri/target/release/$APP_BINARY" "$LOCAL_PREFIX/bin/$APP_BINARY"
      install -m 0644 "src-tauri/icons/128x128.png" "$LOCAL_PREFIX/share/icons/hicolor/128x128/apps/luftfixed.png"
      APP_EXEC="$LOCAL_PREFIX/bin/$APP_BINARY"
      write_desktop_file "$LOCAL_PREFIX/share/applications/$DESKTOP_FILE_NAME" "$APP_EXEC" "luftfixed"
      ;;
  esac
}

write_desktop_file() {
  local target="$1"
  local exec_path="$2"
  local icon_name="$3"

  cat >"$target" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Linux sistem kurulum ve bakim yardimcisi
Exec=$exec_path
Icon=$icon_name
Terminal=false
Categories=Utility;System;
StartupNotify=true
EOF

  chmod 0755 "$target"
}

find_installed_desktop_file() {
  local desktop
  desktop="$(find /usr/share/applications "$LOCAL_PREFIX/share/applications" \
    -maxdepth 1 -type f \( -iname '*luftfixed*.desktop' -o -iname '*luft*.desktop' \) \
    -print 2>/dev/null | sort | head -n 1)"

  if [ -n "$desktop" ]; then
    printf '%s' "$desktop"
    return 0
  fi

  return 1
}

create_desktop_shortcut() {
  local app_desktop
  app_desktop="$(find_installed_desktop_file || true)"

  if [ -z "$app_desktop" ]; then
    mkdir -p "$LOCAL_PREFIX/share/applications"
    app_desktop="$LOCAL_PREFIX/share/applications/$DESKTOP_FILE_NAME"
    write_desktop_file "$app_desktop" "$APP_EXEC" "luftfixed"
  fi

  if have update-desktop-database; then
    update-desktop-database "$LOCAL_PREFIX/share/applications" >/dev/null 2>&1 || true
  fi

  local desktop_dir
  desktop_dir="$(xdg-user-dir DESKTOP 2>/dev/null || printf '%s/Desktop' "$HOME")"

  if [ -d "$desktop_dir" ]; then
    cp "$app_desktop" "$desktop_dir/$DESKTOP_FILE_NAME"
    chmod 0755 "$desktop_dir/$DESKTOP_FILE_NAME"

    if have gio; then
      gio set "$desktop_dir/$DESKTOP_FILE_NAME" metadata::trusted true >/dev/null 2>&1 || true
    fi

    log "Masaustu kisayolu hazir: $desktop_dir/$DESKTOP_FILE_NAME"
  else
    warn "Masaustu klasoru bulunamadi; uygulama baslat menusu/uygulama menusu icinden acilabilir."
  fi
}

launch_app() {
  log "LuftFixed aciliyor"

  if have "$APP_BINARY"; then
    nohup "$APP_BINARY" >/dev/null 2>&1 &
  elif [ -n "${APP_EXEC:-}" ] && [ -x "$APP_EXEC" ]; then
    nohup "$APP_EXEC" >/dev/null 2>&1 &
  else
    warn "Uygulama otomatik acilamadi. Baslat menusu/uygulama menusu icinden LuftFixed'i ac."
  fi
}

main() {
  require_linux
  load_os_release
  detect_package_family

  log "Dagitim: $OS_PRETTY"
  log "Kurulum tipi: $BUNDLE_KIND"

  install_system_dependencies
  ensure_rust
  ensure_node_version
  sync_source
  build_app
  install_package_or_binary
  create_desktop_shortcut
  launch_app

  log "Kurulum tamamlandi. Bundan sonra LuftFixed'i baslat menusu, uygulama menusu veya masaustu kisayolundan acabilirsin."
}

main "$@"
