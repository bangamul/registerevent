<?php

header('Content-Type: application/json');

// CORS VITE
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

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
    ORDER BY name ASC
");

$stmt->execute();

$peserta = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($peserta as &$item) {
    $item['status'] = (bool) $item['status'];
}

echo json_encode([
    'success' => true,
    'data' => $peserta,
    'total' => count($peserta),
]);
