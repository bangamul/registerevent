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
    $status = trim($_POST['rsvp_status'] ?? '');
    $title = trim($_POST['rsvp_closed_title'] ?? '');
    $message = trim($_POST['rsvp_closed_message'] ?? '');
    $contact = trim($_POST['rsvp_contact_person'] ?? '');

    $stmt = $pdo->prepare("
        INSERT INTO event_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    ");

    if ($status !== '') {
        $stmt->execute(['rsvp_status', $status]); // 'open' | 'closed'
        if ($status === 'closed') {
            $stmt->execute(['rsvp_closed_at', date('Y-m-d H:i:s')]);
        }
    }
    if ($title !== '') {
        $stmt->execute(['rsvp_closed_title', $title]);
    }
    if ($message !== '') {
        $stmt->execute(['rsvp_closed_message', $message]);
    }
    if ($contact !== '') {
        $stmt->execute(['rsvp_contact_person', $contact]);
    }
}

// GET or Return updated settings
$stmt = $pdo->query("SELECT setting_key, setting_value FROM event_settings WHERE setting_key LIKE 'rsvp_%'");
$rawSettings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$status = $rawSettings['rsvp_status'] ?? 'open';
$title = $rawSettings['rsvp_closed_title'] ?? 'Konfirmasi Kehadiran Telah Ditutup';
$message = $rawSettings['rsvp_closed_message'] ?? 'Batas waktu konfirmasi kehadiran secara online untuk acara Peluncuran Buku telah ditutup oleh panitia pelaksana. Bagi Bapak/Ibu tamu undangan yang telah melakukan konfirmasi kehadiran sebelumnya, e-Ticket dan QR Code tetap dapat diakses untuk registrasi di lokasi acara.';
$contact = $rawSettings['rsvp_contact_person'] ?? 'Panitia Pelaksana';
$closedAt = $rawSettings['rsvp_closed_at'] ?? null;

echo json_encode([
    'success' => true,
    'data' => [
        'status' => $status,
        'is_open' => ($status === 'open'),
        'title' => $title,
        'message' => $message,
        'contact_person' => $contact,
        'closed_at' => $closedAt
    ]
]);
