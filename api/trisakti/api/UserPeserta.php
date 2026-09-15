<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$idRegistrasi = $_POST['id_registrasi'] ?? '';

if (!$idRegistrasi) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'ID registrasi wajib diisi'
    ]);

    exit;
}

$stmt = $pdo->prepare("
    SELECT
        id,
        id_registrasi,
        id_independent,
        name,
        notelp,
        email,
        foto,
        pekerjaan,
        waktu_hadir,
        waktu_sesi_2,
        gate,
        role_permission,
        status
    FROM user_peserta
    WHERE id_registrasi = ?
    LIMIT 1
");

$stmt->execute([$idRegistrasi]);

$peserta = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$peserta) {
    http_response_code(404);

    echo json_encode([
        'success' => false,
        'message' => 'Data peserta tidak ditemukan'
    ]);

    exit;
}

$peserta['status'] = (bool) $peserta['status'];

echo json_encode([
    'success' => true,
    'data' => $peserta
]);
