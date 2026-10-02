# AFU · Console

Projelerimi bir oyun konsolunun ana ekranı gibi sergileyen portfolyo. Next.js + TypeScript, iki dilli (TR/EN).
Klavye, fare, dokunmatik ekran ve oyun kumandasıyla gezilir. Hiçbir ses, logo veya ikon dosyası yok: sesler Web Audio ile
tarayıcıda sentezleniyor, kapak görselleri her projenin renk paletinden SVG olarak üretiliyor.

## Menüler ve karşılıkları

| Konsolda | Portfolyoda |
| --- | --- |
| Açılış ve "Kumandayı kim kullanıyor?" | Karşılama; Misafir, Sahip ve İşe alım (doğrudan CV'ye gider) |
| Oyunlar sırası | Projeler; her biri kendi oyun sayfasına açılır |
| Oyun sayfası | Açıklama, özellikler (Aktiviteler), teknolojiler, proje kupaları, galeri, demo ve kaynak kod |
| Keşfet / Profil | CV: deneyim, yetenekler, eğitim, diller, oynanan oyunlar |
| Kupalar | Sertifikalar ve ödüller + ziyaretçinin gezerken kazandığı konsol kupaları |
| Oyun Kütüphanesi | Tüm projeler, duruma göre filtreli |
| Medya | Blog yazıları, eğitimler, konuşmalar ve sosyal bağlantılar |
| Kontrol merkezi | İletişim, müzik, ses, ayarlar, güç (dinlenme modu, kapat, yeniden başlat) |
| Ayarlar | Dil, tema (Kozmik, Kuzey ışığı, Kor, Gece), hareket efektleri, sesler |

## Kontroller

| | Klavye | Kumanda | Dokunmatik |
| --- | --- | --- | --- |
| Gezin | Oklar / WASD | Yön tuşları, sol çubuk | Kaydır |
| Seç | Enter / Boşluk | Alt yüz tuşu | Dokun (seçili karoya tekrar dokun) |
| Geri | Esc / Backspace | Sağ yüz tuşu | Sol üstteki geri oku |
| Kontrol merkezi | P | Orta tuş / Options | Alttaki yuvarlak düğme |

## İçeriği değiştirmek

Her şey tek dosyada: `content/portfolio.ts`.

- `profile`: CV bilgileri. `level` yıl deneyimi olarak gösterilir.
- `projects`: her proje bir "oyun". `palette` ve `motif` kapak görselini belirler
  (`orbit`, `grid`, `waves`, `shards`, `rings`, `dunes`, `city`, `circuit`), `logo` başlığın yazı tipini.
- `achievements`: sertifikalar, ödüller, kilometre taşları.
- `media`: yazılar ve eğitimler. `socials`: iletişim bağlantıları.

Gerçek görsel kullanmak için resimleri `public/projects/` altına koyup projeye `cover` (kare karo), `hero` (geniş arka plan)
ve `screenshots` (galeri ve aktivite kartları) alanlarını ekle, örneğin `cover: "/projects/neon-drift.jpg"`.
Resim verilmeyen yerlerde üretilen kapak sanatı kullanılır.

`sample: true` işaretli girdiler örnek içeriktir ve ekranda "Örnek içerik" rozetiyle görünür; kendi bilginle değiştirince bayrağı sil.
`#` olan bağlantılar açılmaz, "Bu bağlantı henüz eklenmedi" der.

## Çalıştırma

```bash
cd ps5-showcase
npm install
npm run dev        # http://localhost:3100
npm run build
npm run preview    # preview/index.html: kurulum gerektirmeyen tek dosyalık sürüm
```

`preview/index.html` tarayıcıda doğrudan açılabilir; içeriği değiştirdikten sonra `npm run preview` ile yenile.

Bu klasör kökteki blogdan bağımsızdır. Vercel'de ayrı bir proje olarak yayınlamak için "Root Directory" olarak `ps5-showcase` seçilir.
