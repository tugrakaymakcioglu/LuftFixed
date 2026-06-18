# LuftFixed

LuftFixed, Linux'a geçmek isteyen son kullanıcılar için terminal zorunluluğunu azaltan bir masaüstü yardımcı aracıdır. Uygulama sistemi algılar, dağıtıma uygun işlem kataloğunu hazırlar ve kullanıcının güncelleme, uygulama kurma, sürücü hazırlama, güvenlik duvarı açma gibi işleri tek ekrandan güvenli şekilde planlamasını sağlar.

## Mevcut kapsam

- Tauri + React + TypeScript masaüstü uygulaması
- Linux dağıtım algılama: `/etc/os-release`, masaüstü ortamı, çekirdek, mimari, paket yöneticisi
- Desteklenen paket yöneticileri: `apt`, `dnf`, `pacman`, `zypper`
- Tek kaynaklı işlem kataloğu: `public/catalog/actions.tr.json`
- Hazır işlemler: sistem güncelleme, Flatpak/Flathub, tarayıcılar, codec paketleri, Steam, geliştirici araçları, temizlik, güvenlik duvarı, NVIDIA sürücü planı
- Güvenli önizleme modu ve gerçek komut yürütme modu
- Yönetici yetkisi için Polkit/pkexec kontrolü
- Tarayıcıda fail-closed önizleme: gerçek dağıtım/paket yöneticisi bilgisi uydurulmaz

## Güvenlik modeli

- Rastgele kullanıcı komutu çalıştırılmaz.
- Komutlar yalnızca sürümlenmiş JSON katalogdan gelir.
- Komutlar shell string olarak değil, program + argv şeklinde çalıştırılır.
- Yönetici yetkisi gereken adımlar `pkexec` üzerinden çalışır.
- Linux dışındaki sistemlerde gerçek yürütme kapalıdır.
- Katalog, `npm run validate:catalog` ile doğrulanır.

## Direkt kopyala-yapıştır kurulum ve derleme

Aşağıdan kendi Linux dağıtımına uygun bloğu seçip terminale tek parça halinde yapıştır. Komutlar depoyu indirir veya mevcut klasörü günceller, bağımlılıkları kurar, projeyi doğrular ve Tauri masaüstü paketini üretir.

Derleme çıktısı işlem tamamlandıktan sonra `src-tauri/target/release/bundle/` altında oluşur.

### Ubuntu, Debian, Linux Mint, Pop!_OS

```bash
set -e

sudo apt update
sudo apt install -y \
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

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

. "$HOME/.cargo/env"

if [ -d LuftFixed/.git ]; then
  cd LuftFixed
  git pull --ff-only
else
  git clone https://github.com/tugrakaymakcioglu/LuftFixed.git LuftFixed
  cd LuftFixed
fi

npm ci
npm run verify
npm run tauri:build
```

### Fedora

```bash
set -e

sudo dnf check-update || true
sudo dnf install -y \
  git \
  curl \
  wget \
  file \
  nodejs \
  npm \
  webkit2gtk4.1-devel \
  openssl-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libxdo-devel
sudo dnf group install -y c-development

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

. "$HOME/.cargo/env"

if [ -d LuftFixed/.git ]; then
  cd LuftFixed
  git pull --ff-only
else
  git clone https://github.com/tugrakaymakcioglu/LuftFixed.git LuftFixed
  cd LuftFixed
fi

npm ci
npm run verify
npm run tauri:build
```

### Arch Linux, EndeavourOS, Manjaro

```bash
set -e

sudo pacman -Syu --needed --noconfirm \
  git \
  nodejs \
  npm \
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

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

. "$HOME/.cargo/env"

if [ -d LuftFixed/.git ]; then
  cd LuftFixed
  git pull --ff-only
else
  git clone https://github.com/tugrakaymakcioglu/LuftFixed.git LuftFixed
  cd LuftFixed
fi

npm ci
npm run verify
npm run tauri:build
```

### openSUSE Tumbleweed, Leap

```bash
set -e

sudo zypper --non-interactive refresh
sudo zypper --non-interactive update
sudo zypper --non-interactive install \
  git \
  nodejs \
  npm \
  webkit2gtk3-devel \
  libopenssl-devel \
  curl \
  wget \
  file \
  libappindicator3-1 \
  librsvg-devel
sudo zypper --non-interactive install -t pattern devel_basis

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

. "$HOME/.cargo/env"

if [ -d LuftFixed/.git ]; then
  cd LuftFixed
  git pull --ff-only
else
  git clone https://github.com/tugrakaymakcioglu/LuftFixed.git LuftFixed
  cd LuftFixed
fi

npm ci
npm run verify
npm run tauri:build
```

### Alpine Linux

```bash
set -e

sudo apk update
sudo apk add \
  git \
  nodejs \
  npm \
  build-base \
  webkit2gtk-4.1-dev \
  curl \
  wget \
  file \
  openssl \
  libayatana-appindicator-dev \
  librsvg \
  font-dejavu

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

. "$HOME/.cargo/env"

if [ -d LuftFixed/.git ]; then
  cd LuftFixed
  git pull --ff-only
else
  git clone https://github.com/tugrakaymakcioglu/LuftFixed.git LuftFixed
  cd LuftFixed
fi

npm ci
npm run verify
npm run tauri:build
```

### Sadece geliştirme modunda çalıştırma

Yukarıdaki kurulum bloklarından birini tamamladıktan sonra uygulamayı geliştirme modunda açmak için:

```bash
cd LuftFixed
npm run tauri:dev
```

Native sistem bağımlılıkları Tauri 2'nin resmi Linux ön koşullarıyla uyumludur: https://v2.tauri.app/start/prerequisites/

## Geliştirme

```bash
npm install
npm run dev
```

Tauri masaüstü uygulamasını çalıştırmak için:

```bash
npm run tauri:dev
```

Release öncesi doğrulama:

```bash
npm run verify
cargo fmt --check
```

Tam Tauri derlemesi için sistemde Rust toolchain'e ek olarak platforma uygun native build araçları gerekir.

## Katalog güncelleme

Yeni bir işlem eklemek için `public/catalog/actions.tr.json` dosyasına yeni bir kayıt ekleyin. Her komut şu formatta olmalıdır:

```json
{
  "program": "apt",
  "args": ["install", "-y", "flatpak"],
  "requiresAdmin": true
}
```

Katalogda shell operatörleri, path tabanlı programlar veya kullanıcıdan gelen serbest komutlar kullanılmamalıdır.

## Yol haritası

1. AppImage, `.deb` ve `.rpm` paketleri için release pipeline
2. Donanım algılama: NVIDIA/AMD, Wi-Fi, Bluetooth, yazıcı
3. Dağıtım/sürüm bazlı preflight kontrolleri
4. İşlem geçmişi, log dışa aktarma ve hata raporu
5. Daha geniş uygulama kataloğu ve topluluk katkı süreci
