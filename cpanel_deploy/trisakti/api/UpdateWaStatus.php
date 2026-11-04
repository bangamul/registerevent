<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$phone = trim($_POST['notelp'] ?? $_POST['phone'] ?? '');
$idRegistrasi = trim($_POST['id_registrasi'] ?? '');
$status = trim($_POST['status'] ?? 'sent'); // 'sent' | 'failed' | 'unsent'

if ($phone === '' && $idRegistrasi === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nomor WhatsApp atau ID Registrasi wajib diisi']);
    exit;
}

$cleanPhone = preg_replace('/\D/', '', $phone);
$variants = array_unique(array_filter([
    $phone,
    $cleanPhone,
    str_starts_with($cleanPhone, '0') ? '62' . substr($cleanPhone, 1) : '',
    str_starts_with($cleanPhone, '62') ? '0' . substr($cleanPhone, 2) : '',
]));

// Cari peserta di database
$peserta = null;
if ($idRegistrasi !== '') {
    $stmt = $pdo->prepare("SELECT id, id_registrasi, name FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (!$peserta && !empty($variants)) {
    $placeholders = implode(',', array_fill(0, count($variants), '?'));
    $stmt = $pdo->prepare("SELECT id, id_registrasi, name FROM user_peserta WHERE notelp IN ($placeholders) LIMIT 1");
    $stmt->execute(array_values($variants));
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (!$peserta) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Data peserta tidak ditemukan']);
    exit;
}

try {
    // Update status pengiriman WA pada user_peserta
    if ($status === 'sent' || $status === 'manual_sent') {
        $stmtUpdate = $pdo->prepare("
            UPDATE user_peserta
            SET wa_status = 'sent',
                waktu_kirim_wa = NOW()
            WHERE id = ?
        ");
        $stmtUpdate->execute([$peserta['id']]);

        $actName = ($status === 'manual_sent') ? 'WhatsApp Dikirim (Manual Klien)' : 'WhatsApp Terkirim';
        $actDesc = ($status === 'manual_sent') 
            ? 'Undangan dikirimkan langsung oleh pimpinan / tim klien secara personal via WhatsApp.'
            : 'Pesan undangan dan tautan tiket QR berhasil dikirim ke nomor WhatsApp peserta.';

        // Catat ke log_activity
        $stmtLog = $pdo->prepare("
            INSERT INTO log_activity (user_admin_id, participant_id, activity, description, created_at)
            VALUES (1, ?, ?, ?, NOW())
        ");
        $stmtLog->execute([$peserta['id'], $actName, $actDesc]);
    } else if ($status === 'failed') {
        $stmtUpdate = $pdo->prepare("
            UPDATE user_peserta
            SET wa_status = 'failed'
            WHERE id = ?
        ");
        $stmtUpdate->execute([$peserta['id']]);
    } else if ($status === 'unsent') {
        $stmtUpdate = $pdo->prepare("
            UPDATE user_peserta
            SET wa_status = 'unsent',
                waktu_kirim_wa = NULL
            WHERE id = ?
        ");
        $stmtUpdate->execute([$peserta['id']]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Status pengiriman WhatsApp berhasil diperbarui',
        'participant_id' => $peserta['id']
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Gagal memperbarui status: ' . $e->getMessage()]);
}
