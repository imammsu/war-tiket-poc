# War Tiket PoC (Proof of Concept)

Proyek ini adalah sebuah Proof of Concept (PoC) untuk sistem pemesanan tiket kereta api ("War Tiket") yang dibangun menggunakan arsitektur **Microservices** dan **Event-Driven Architecture**. Fokus utama proyek ini adalah mendemonstrasikan penanganan beban tinggi (high concurrency), konsistensi data menggunakan **Saga Pattern**, dan penggunaan berbagai **Design Patterns**.

---

## 🚀 Arsitektur Utama

Sistem ini menggunakan pendekatan **Choreography-based Saga** untuk mengelola transaksi yang melibatkan banyak layanan. Komunikasi antar layanan dilakukan secara asinkron melalui simulator Message Broker (RabbitMQ Simulator).

### Microservices yang Terlibat:
1.  **AuthService**: Memvalidasi identitas pengguna.
2.  **BookingService**: Koordinator utama pemesanan dan pengelola status transaksi (TTL).
3.  **SeatService**: Pengelola inventori kursi dan status ketersediaan.
4.  **PaymentService**: Menangani pemrosesan pembayaran dengan berbagai metode.
5.  **InvoiceService**: Menghasilkan invoice hanya setelah pembayaran berhasil.
6.  **ScheduleService**: Menyediakan informasi jadwal kereta dengan dukungan caching.
7.  **NotificationService**: Mengirim notifikasi push ke pengguna mengenai status pesanan.

---

## 🛠️ Design Patterns & Implementasi Teknis

Proyek ini menerapkan beberapa pola desain perangkat lunak tingkat lanjut:

### 1. Saga Pattern (Choreography)
Mengelola konsistensi data di seluruh microservices tanpa database terpusat.
*   **Happy Path**: Booking -> Seat Locked -> Request Payment -> Payment Success -> Confirmed + Invoice.
*   **Compensating Transaction**: Jika pembayaran gagal atau waktu habis (TTL), sistem secara otomatis memicu event untuk membebaskan kembali kursi (`SeatService`) dan membatalkan pesanan (`BookingService`).

### 2. Time-Based Circuit Breaker (Redis TTL)
Mencegah kursi tertahan selamanya oleh pengguna yang tidak menyelesaikan pembayaran.
*   **Mekanisme**: Menggunakan `RedisSimulator` untuk mengatur TTL (Time-To-Live). Jika dalam waktu yang ditentukan (15 detik di PoC ini) user tidak mengirim request ke endpoint payment, Redis akan memicu **Keyspace Notification** yang dikirim ke **Dead Letter Exchange (DLX)** untuk membatalkan transaksi dan mengembalikan kursi ke `AVAILABLE`.

### 3. Strategy Pattern (Payment)
Memungkinkan sistem untuk menambah atau mengubah metode pembayaran tanpa merubah logika inti `PaymentService`.
*   **Implementasi**: `BCAStrategy`, `MandiriStrategy`, `QRISStrategy`, dan `EWalletStrategy`.

### 4. Proxy Pattern (Payment Gateway)
Digunakan sebagai perantara antara sistem dan gateway pembayaran pihak ketiga.
*   **Fungsi**: Menangani logika **Retry Mechanism** (mencoba ulang hingga 3 kali jika terjadi kegagalan jaringan) sebelum benar-benar menyatakan pembayaran gagal.

### 5. State Pattern (Seat Status)
Mengelola transisi status kursi agar tetap konsisten dan mengikuti aturan bisnis.
*   **Status**: `AVAILABLE` -> `RESERVED` -> `CONFIRMED`.

### 6. Redis Caching
Meningkatkan performa pembacaan data yang jarang berubah namun sering diakses.
*   **Implementasi**: `ScheduleService` menyimpan data jadwal di Redis simulator selama 1 menit untuk mengurangi beban database utama.

---

## 📂 Struktur Folder
```text
src/
├── infrastructure/    # Simulator RabbitMQ, Redis, dan InMemoryDB
├── patterns/          # Implementasi Design Patterns (Proxy, State, Strategy)
├── routes/            # Express API Routes
├── services/          # Core Business Logic (Microservices)
├── simulation/        # Skrip pengujian otomatis untuk berbagai skenario
└── index.ts           # Entry point aplikasi
```

---

## 🏃 Cara Menjalankan

### Prasyarat
*   Node.js (v14 atau lebih baru)
*   npm atau yarn

### Instalasi
1. Clone repository
2. Jalankan `npm install`

### Menjalankan Server
```bash
npm start
```
Server akan berjalan di `http://localhost:3000`.

### Mencoba Skenario (Endpoint)

1.  **Cek Jadwal (Redis Cache)**:
    `GET /schedules`
2.  **Lihat Kursi**:
    `GET /seats`
3.  **Booking Tiket**:
    ```bash
    POST /booking
    {
      "userId": "U1",
      "scheduleId": "SCH-001",
      "seatId": "SCH001-A01"
    }

    {
      "userId": "U1",
      "scheduleId": "SCH-001",
      "seatId": "SCH001-A02"
    }
    ```
    Response akan berisi `bookingId`, `paymentUrl`, dan `expiresInMs`.
4.  **Request Payment (Happy Path)**:
    ```bash
    POST /payment/:bookingId
    {
      "paymentMethod": "BCA"
    }
    ```
    {
      "paymentMethod": "BCA",
      "simulateFail": true
    }

5.  **Simulasi Gagal Bayar (Strategy Pattern)**:
    Tambahkan `"simulateFail": true` pada body request payment. Simulasi ini menggunakan strategy pembayaran gagal, sehingga booking menjadi `CANCELLED`, kursi kembali `AVAILABLE`, dan invoice tidak dibuat.
6.  **Simulasi TTL/Kadaluarsa**:
    Buat booking, jangan panggil endpoint payment selama 15 detik, lalu coba panggil `POST /payment/:bookingId`. Sistem akan menolak payment karena booking sudah `EXPIRED`, kursi kembali `AVAILABLE`, dan invoice tidak dibuat. Jika request payment sudah diterima sebelum TTL habis, TTL dihentikan dan booking masuk status `PAYMENT_PROCESSING`.

---

## 📊 Analisis Aliran Data
1.  **User** melakukan POST ke `/booking`.
2.  **BookingService** membuat record PENDING dan mem-publish `BOOKING_INITIATED`.
3.  **SeatService** mengunci kursi (`RESERVED`) dan mem-publish `SEAT_LOCKED`.
4.  **BookingService** mengatur **TTL 15 detik** di Redis.
5.  **User** melakukan POST ke `/payment/:bookingId` sebelum TTL habis, lalu TTL dihentikan.
6.  **PaymentService** memproses bayar via **Proxy** (Retry) & **Strategy**.
7.  Jika sukses sebelum 15 detik: Booking jadi `PAID`, kursi jadi `CONFIRMED`, TTL dihapus, dan invoice dibuat.
8.  Jika gagal: Booking jadi `CANCELLED`, kursi kembali `AVAILABLE`, dan invoice tidak dibuat.
9.  Jika tidak ada request payment sampai TTL habis: Booking jadi `EXPIRED`, kursi kembali `AVAILABLE`, dan payment berikutnya ditolak.
