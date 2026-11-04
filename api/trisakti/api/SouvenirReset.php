<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$idRegistrasi = trim($_POST['id_registrasi'] ?? '');
$adminId = trim($_POST['user_admin_id'] ?? '1');

if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID registrasi wajib diisi',
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, id_registrasi FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$peserta) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Peserta tidak ditemukan',
        ]);
        exit;
    }

    $stmtUpdate = $pdo->prepare("
        UPDATE user_peserta
        SET waktu_souvenir = NULL, souvenir_status = 'unclaimed', souvenir_petugas = NULL
        WHERE id = ?
    ");
    $stmtUpdate->execute([$peserta['id']]);

    $stmtLog = $pdo->prepare("
        INSERT INTO log_activity (user_admin_id, participant_id, activity, description)
        VALUES (?, ?, 'SOUVENIR_RESET', ?)
    ");
    $stmtLog->execute([
        (int) $adminId,
        $peserta['id'],
        "Reset status pengambilan souvenir peserta {$peserta['name']} ({$peserta['id_registrasi']})"
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Status souvenir {$peserta['name']} berhasil direset ke Belum Ambil.",
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mereset status souvenir: ' . $e->getMessage(),
    ]);
}
