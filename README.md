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
