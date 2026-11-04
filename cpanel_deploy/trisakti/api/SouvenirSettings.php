<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Pastikan table event_settings ada
$pdo->exec("
    CREATE TABLE IF NOT EXISTS event_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
");

if ($method === 'POST') {
    $mode = trim($_POST['souvenir_mode'] ?? '');
    $startTime = trim($_POST['souvenir_start_time'] ?? '');
    $startDate = trim($_POST['souvenir_start_date'] ?? '');
    $title = trim($_POST['souvenir_title'] ?? '');

    $stmt = $pdo->prepare("
        INSERT INTO event_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    ");

    if ($mode !== '') {
        $stmt->execute(['souvenir_mode', $mode]);
    }
    if ($startTime !== '') {
        $stmt->execute(['souvenir_start_time', $startTime]);
    }
    if ($startDate !== '') {
        $stmt->execute(['souvenir_start_date', $startDate]);
    }
    if ($title !== '') {
        $stmt->execute(['souvenir_title', $title]);
    }
}

// GET or Return updated settings
$stmt = $pdo->query("SELECT setting_key, setting_value FROM event_settings WHERE setting_key LIKE 'souvenir_%'");
$rawSettings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$mode = $rawSettings['souvenir_mode'] ?? 'auto';
$startTime = $rawSettings['souvenir_start_time'] ?? '17:00';
$startDate = $rawSettings['souvenir_start_date'] ?? '2026-11-09';
$title = $rawSettings['souvenir_title'] ?? 'Paket Souvenir Eksklusif Peluncuran Buku';

// Hitung status buka/tutup
$now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));
$currentTimeStr = $now->format('H:i');
$currentDateStr = $now->format('Y-m-d');
$currentTimestamp = $now->getTimestamp();

$isOpen = false;
$statusText = '';

if ($mode === 'open') {
    $isOpen = true;
    $statusText = 'DIBUKA (Manual Buka)';
} elseif ($mode === 'closed') {
    $isOpen = false;
    $statusText = 'DITUTUP (Manual Tutup)';
} else {
    // Mode Auto: cek apakah tanggal & jam sekarang sudah mencapai jadwal buka
    // Jika tanggal hari ini < startDate, belum buka
    // Jika tanggal sama, bandingkan waktu
    $targetDateTime = DateTime::createFromFormat('Y-m-d H:i', "$startDate $startTime", new DateTimeZone('Asia/Jakarta'));
    if (!$targetDateTime) {
        $targetDateTime = DateTime::createFromFormat('H:i', $startTime, new DateTimeZone('Asia/Jakarta'));
    }

    if ($targetDateTime) {
        if ($now >= $targetDateTime) {
            $isOpen = true;
            $statusText = "DIBUKA OTOMATIS (Jadwal: $startTime WIB)";
        } else {
            $isOpen = false;
            $statusText = "BELUM DIBUKA (Jadwal Buka: $startTime WIB)";
        }
    } else {
        $isOpen = true;
        $statusText = 'DIBUKA';
    }
}

// Statistik Souvenir
$stmtStat = $pdo->query("
    SELECT 
        COUNT(*) as total_peserta,
        SUM(CASE WHEN souvenir_status = 'claimed' OR waktu_souvenir IS NOT NULL THEN 1 ELSE 0 END) as claimed_count,
        SUM(CASE WHEN souvenir_status != 'claimed' AND waktu_souvenir IS NULL THEN 1 ELSE 0 END) as unclaimed_count
    FROM user_peserta
");
$stat = $stmtStat->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => [
        'mode' => $mode,
        'start_time' => $startTime,
        'start_date' => $startDate,
        'title' => $title,
        'is_open' => $isOpen,
        'status_text' => $statusText,
        'current_time' => $currentTimeStr,
        'current_date' => $currentDateStr,
        'stats' => [
            'total_peserta' => (int) ($stat['total_peserta'] ?? 0),
            'claimed_count' => (int) ($stat['claimed_count'] ?? 0),
            'unclaimed_count' => (int) ($stat['unclaimed_count'] ?? 0),
        ]
    ]
]);
