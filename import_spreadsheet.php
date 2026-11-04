<?php

require_once __DIR__ . '/api/trisakti/api/db.php';

$csvUrl = "https://docs.google.com/spreadsheets/d/1XlK-swspUEU-xpgpht71xmA4gQW8GtPPu_fWXau2mTo/export?format=csv&gid=1849470460";

echo "Mengunduh data CSV dari Google Spreadsheet...\n";
$csvContent = @file_get_contents($csvUrl);
if ($csvContent === false) {
    if (file_exists('/tmp/sheet_data.csv')) {
        echo "Menggunakan cache lokal /tmp/sheet_data.csv...\n";
        $csvContent = file_get_contents('/tmp/sheet_data.csv');
    } else {
        die("Gagal mengunduh CSV dari Google Sheets.\n");
    }
}

// Gunakan stream in-memory agar fgetcsv menangani multi-line cell dengan benar
$stream = fopen('php://temp', 'r+');
fwrite($stream, $csvContent);
rewind($stream);

$rows = [];
while (($row = fgetcsv($stream)) !== false) {
    $rows[] = $row;
}
fclose($stream);

function cleanPhoneNumber($raw) {
    if (!$raw) return '';
    $raw = trim($raw);
    if ($raw === '' || !preg_match('/\d/', $raw)) {
        return '';
    }

    // Cari pola nomor HP Indonesia: 08..., 628..., +628...
    if (preg_match('/(?:(?:\+?62|0)?8[0-9\s\-]{7,15})/', $raw, $matches)) {
        $cleaned = preg_replace('/[\s\-]/', '', $matches[0]);
        if (str_starts_with($cleaned, '+62')) {
            $cleaned = '0' . substr($cleaned, 3);
        } elseif (str_starts_with($cleaned, '62')) {
            $cleaned = '0' . substr($cleaned, 2);
        } elseif (str_starts_with($cleaned, '8')) {
            $cleaned = '0' . $cleaned;
        }
        return $cleaned;
    }

    // Fallback: ambil semua digit jika >= 6 digit
    $digits = preg_replace('/\D/', '', $raw);
    if (strlen($digits) >= 6) {
        if (str_starts_with($digits, '62')) {
            return '0' . substr($digits, 2);
        } elseif (str_starts_with($digits, '8')) {
            return '0' . $digits;
        }
        return $digits;
    }

    return '';
}

// Bersihkan data yang baru masuk sebelumnya agar fresh dan konsisten
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE log_activity; TRUNCATE TABLE user_peserta; SET FOREIGN_KEY_CHECKS = 1;");

$stmtInsert = $pdo->prepare("
    INSERT INTO user_peserta (
        id_registrasi,
        id_independent,
        name,
        notelp,
        email,
        pekerjaan,
        gate,
        role_permission,
        status,
        rsvp_status,
        jalur_undangan,
        wa_status,
        souvenir_status
    ) VALUES (
        :id_registrasi,
        :id_independent,
        :name,
        :notelp,
        NULL,
        :pekerjaan,
        '1',
        '1',
        0,
        'pending',
        :jalur_undangan,
        'unsent',
        'unclaimed'
    )
");

$totalProcessed = 0;
$totalImported = 0;
$skippedVvip = [];
$skippedHeaders = 0;
$withPhone = 0;
$withoutPhone = 0;

$pdo->beginTransaction();

try {
    foreach ($rows as $index => $row) {
        if ($index === 0) continue; // Skip header utama

        $no = isset($row[0]) ? trim($row[0]) : '';
        $name = isset($row[1]) ? trim($row[1]) : '';
        $jabatan = isset($row[2]) ? trim($row[2]) : '';
        $kontak = isset($row[3]) ? trim($row[3]) : '';

        // Abaikan baris pembagi/kategori yang bukan angka
        if (!ctype_digit($no)) {
            $skippedHeaders++;
            continue;
        }

        $totalProcessed++;

        // Aturan: Jika cell no kontak penerima ada kata 'VVIP', lewati
        if (stripos($kontak, 'vvip') !== false) {
            $skippedVvip[] = [
                'no' => $no,
                'name' => $name,
                'jabatan' => $jabatan,
                'kontak' => preg_replace('/\s+/', ' ', $kontak),
            ];
            continue;
        }

        $phone = cleanPhoneNumber($kontak);
        if ($phone !== '') {
            $withPhone++;
            $jalurUndangan = 'blast';
        } else {
            $withoutPhone++;
            $jalurUndangan = 'manual';
        }

        // Generate ID unik
        $idRegistrasi = 'REG-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        $idIndependent = 'IND-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));

        $stmtInsert->execute([
            ':id_registrasi' => $idRegistrasi,
            ':id_independent' => $idIndependent,
            ':name' => $name,
            ':notelp' => $phone,
            ':pekerjaan' => $jabatan !== '' ? $jabatan : null,
            ':jalur_undangan' => $jalurUndangan,
        ]);

        $totalImported++;
    }

    $pdo->commit();
    echo "BERHASIL MENYIMPAN TRANSAKSI KE DATABASE!\n";
} catch (Exception $e) {
    $pdo->rollBack();
    die("GAGAL IMPORT: " . $e->getMessage() . "\n");
}

echo "\n================ HASIL IMPORT DATA ================\n";
echo "Total baris data peserta di sheet: $totalProcessed\n";
echo "Total data BERHASIL dimasukkan ke database: $totalImported\n";
echo "  - Memiliki nomor WhatsApp/kontak: $withPhone (Jalur Blast)\n";
echo "  - Tanpa nomor kontak: $withoutPhone (Jalur Manual VIP)\n";
echo "Total baris DILEWATI (karena mengandung kata 'VVIP'): " . count($skippedVvip) . "\n";
echo "----------------------------------------------------\n";
echo "Daftar 8 peserta VVIP yang dilewati:\n";
foreach ($skippedVvip as $i => $v) {
    echo ($i + 1) . ". [No {$v['no']}] {$v['name']} ({$v['jabatan']})\n";
    echo "   Kontak: '{$v['kontak']}'\n";
}
echo "====================================================\n";
