<?php

header('Content-Type: application/json');

// CORS VITE
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$idRegistrasi = trim($_POST['id_registrasi'] ?? '');
$adminId = trim($_POST['user_id'] ?? ''); 
$requestedAction = strtoupper(trim($_POST['action'] ?? 'CHECKOUT')); // 💡 Tangkap action dari frontend

if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID Registrasi wajib diisi']);
    exit;
}

try {
    // 1. Cari data peserta
    $stmt = $pdo->prepare("SELECT id, name FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$peserta) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Data peserta tidak ditemukan']);
        exit;
    }

    // 2. Tentukan Activity dan Description secara dinamis
    if ($requestedAction === 'CHECKIN' || $requestedAction === 'RE_ENTRY') {
        $activity = 'CHECK_IN';
        $description = sprintf('Peserta melakukan clock in / re-entry (%s)', $peserta['name']);
    } else {
        $activity = 'CHECKOUT';
        $description = sprintf('Peserta melakukan clock out (keluar area) (%s)', $peserta['name']);
    }

    // 3. Insert ke log_activity
    $stmtLog = $pdo->prepare("
        INSERT INTO log_activity (user_admin_id, participant_id, activity, description) 
        VALUES (?, ?, ?, ?)
    ");
    
    $stmtLog->execute([
        (int) $adminId,
        (int) $peserta['id'],
        $activity,
        $description
    ]);

    echo json_encode([
        'success' => true,
        'message' => $activity === 'CHECK_IN' ? 'Clock in berhasil disimpan' : 'Clock out berhasil disimpan',
        'data' => [
            'id_registrasi' => $idRegistrasi,
            'name' => $peserta['name'],
            'activity' => $activity
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Gagal menyimpan log activity']);
}
