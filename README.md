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
5.  **InvoiceService**: Menghasilkan invoice berdasarkan pesanan yang berhasil dikunci.
6.  **ScheduleService**: Menyediakan informasi jadwal kereta dengan dukungan caching.
7.  **NotificationService**: Mengirim notifikasi push ke pengguna mengenai status pesanan.

---

## 🛠️ Design Patterns & Implementasi Teknis

Proyek ini menerapkan beberapa pola desain perangkat lunak tingkat lanjut:

### 1. Saga Pattern (Choreography)
Mengelola konsistensi data di seluruh microservices tanpa database terpusat.
*   **Happy Path**: Booking -> Seat Locked -> Payment Success -> Confirmed.
*   **Compensating Transaction**: Jika pembayaran gagal atau waktu habis (TTL), sistem secara otomatis memicu event untuk membebaskan kembali kursi (`SeatService`) dan membatalkan pesanan (`BookingService`).

### 2. Time-Based Circuit Breaker (Redis TTL)
Mencegah kursi tertahan selamanya oleh pengguna yang tidak menyelesaikan pembayaran.
*   **Mekanisme**: Menggunakan `RedisSimulator` untuk mengatur TTL (Time-To-Live). Jika dalam waktu yang ditentukan (15 detik di PoC ini) pembayaran tidak diterima, Redis akan memicu **Keyspace Notification** yang dikirim ke **Dead Letter Exchange (DLX)** untuk membatalkan transaksi.

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
3.  **Booking Tiket (Happy Path)**:
    ```bash
    POST /booking
    {
      "userId": "U1",
      "scheduleId": "SCH-001",
      "seatId": "SCH001-A01",
      "paymentMethod": "BCA"
    }
    ```
4.  **Simulasi Gagal Bayar (Compensating Transaction)**:
    Tambahkan `"simulateFail": true` pada body request.
5.  **Simulasi TTL/Kadaluarsa**:
    Tambahkan `"simulateExpiry": true` pada body request (akan menunda pembayaran selama 20 detik, sementara TTL hanya 15 detik).

---

## 📊 Analisis Aliran Data
1.  **User** melakukan POST ke `/booking`.
2.  **BookingService** membuat record PENDING dan mem-publish `BOOKING_INITIATED`.
3.  **SeatService** mengunci kursi (`RESERVED`) dan mem-publish `SEAT_LOCKED`.
4.  **InvoiceService** membuat tagihan.
5.  **BookingService** mengatur **TTL 15 detik** di Redis.
6.  **PaymentService** memproses bayar via **Proxy** (Retry) & **Strategy**.
7.  Jika sukses sebelum 15 detik: Semua status jadi PAID/CONFIRMED, TTL dihapus.
8.  Jika gagal/timeout: Event kadaluarsa memicu pengembalian status kursi ke AVAILABLE.
