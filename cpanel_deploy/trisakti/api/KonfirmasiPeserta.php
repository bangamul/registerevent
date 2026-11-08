<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

// Cek apakah konfirmasi online ditutup oleh panitia
try {
    $stmtCheckRsvp = $pdo->query("SELECT setting_value FROM event_settings WHERE setting_key = 'rsvp_status' LIMIT 1");
    if ($stmtCheckRsvp) {
        $currentRsvpStatus = $stmtCheckRsvp->fetchColumn();
        if ($currentRsvpStatus === 'closed') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Mohon maaf, batas waktu konfirmasi kehadiran secara online telah ditutup oleh panitia.'
            ]);
            exit;
        }
    }
} catch (Exception $e) {
    // Abaikan jika tabel belum ada
}

$phone = trim($_POST['notelp'] ?? $_POST['phone'] ?? '');
$idRegistrasi = trim($_POST['id_registrasi'] ?? '');
$name = trim($_POST['name'] ?? '');
$action = trim($_POST['action'] ?? 'confirm'); // 'confirm' | 'decline'
$email = trim($_POST['email'] ?? '');
$pekerjaan = trim($_POST['pekerjaan'] ?? '');
$gate = trim($_POST['gate'] ?? '1');
$role_permission = trim($_POST['role_permission'] ?? '1');

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
    $stmt = $pdo->prepare("SELECT * FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (!$peserta && !empty($variants)) {
    $placeholders = implode(',', array_fill(0, count($variants), '?'));
    $stmt = $pdo->prepare("SELECT * FROM user_peserta WHERE notelp IN ($placeholders) LIMIT 1");
    $stmt->execute(array_values($variants));
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (!$peserta && $name !== '') {
    $stmt = $pdo->prepare("SELECT * FROM user_peserta WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
    $stmt->execute([$name]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);
}

$newStatus = ($action === 'decline') ? 'declined' : 'confirmed';

if ($peserta) {
    $wasAlreadyConfirmed = ($peserta['rsvp_status'] === 'confirmed');

    // Jika tamu mengisi / memperbarui nomor telepon, update nomor teleponnya di database
    $updatePhone = ($phone !== '') ? $phone : $peserta['notelp'];

    // Update data peserta yang sudah ada di database tanpa menimpa waktu konfirmasi pertama jika sudah pernah konfirmasi
    $stmtUpdate = $pdo->prepare("
        UPDATE user_peserta
        SET rsvp_status = ?,
            waktu_konfirmasi = COALESCE(waktu_konfirmasi, NOW()),
            notelp = ?
        WHERE id = ?
    ");
    $stmtUpdate->execute([$newStatus, $updatePhone, $peserta['id']]);

    // Ambil data terbaru
    $stmt = $pdo->prepare("
        SELECT id, id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, waktu_hadir, waktu_sesi_2, waktu_konfirmasi, waktu_souvenir, souvenir_status, gate, role_permission, seating_arrangement, status, rsvp_status
        FROM user_peserta WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$peserta['id']]);
    $updated = $stmt->fetch(PDO::FETCH_ASSOC);
    $updated['id'] = (int) $updated['id'];
    $updated['status'] = (bool) $updated['status'];

    echo json_encode([
        'success' => true,
        'already_confirmed' => $wasAlreadyConfirmed && $action === 'confirm',
        'message' => ($wasAlreadyConfirmed && $action === 'confirm')
            ? 'Anda sudah melakukan konfirmasi kehadiran sebelumnya'
            : ($action === 'decline' ? 'Konfirmasi berhalangan hadir telah dicatat' : 'Kehadiran berhasil dikonfirmasi'),
        'data' => $updated
    ]);
    exit;
}

// Jika peserta belum ada di database dan memilih berhalangan
if ($action === 'decline') {
    echo json_encode([
        'success' => true,
        'message' => 'Konfirmasi berhalangan hadir telah dicatat',
        'data' => null
    ]);
    exit;
}

// Jika peserta belum ada di database dan mengonfirmasi hadir, daftarkan otomatis
$idReg = 'REG-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
$idInd = 'IND-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));

$stmtInsert = $pdo->prepare("
    INSERT INTO user_peserta (id_registrasi, id_independent, name, notelp, email, pekerjaan, gate, role_permission, waktu_konfirmasi, status, rsvp_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, 'confirmed')
");
$stmtInsert->execute([
    $idReg,
    $idInd,
    $name !== '' ? $name : 'Tamu Undangan',
    $phone,
    $email !== '' ? $email : null,
    $pekerjaan !== '' ? $pekerjaan : null,
    $gate !== '' ? $gate : '1',
    $role_permission !== '' ? $role_permission : '1'
]);

$newId = $pdo->lastInsertId();
$stmt = $pdo->prepare("
    SELECT id, id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, waktu_hadir, waktu_sesi_2, waktu_konfirmasi, gate, role_permission, seating_arrangement, status, rsvp_status
    FROM user_peserta WHERE id = ? LIMIT 1
");
$stmt->execute([$newId]);
$created = $stmt->fetch(PDO::FETCH_ASSOC);
$created['id'] = (int) $created['id'];
$created['status'] = (bool) $created['status'];

echo json_encode([
    'success' => true,
    'message' => 'Kehadiran berhasil dikonfirmasi',
    'data' => $created
]);
