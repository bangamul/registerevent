<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$name = $_POST['name'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $pdo->prepare("
    SELECT id, name, password, status
    FROM user_admin
    WHERE name = ?
    LIMIT 1
");

$stmt->execute([$name]);

$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Username atau password salah'
    ]);

    exit;
}

// Kalau password di DB menggunakan MD5
if (md5($password) !== $admin['password']) {
    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Username atau password salah'
    ]);

    exit;
}

// status false = tidak aktif
if (!$admin['status']) {
    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' => 'Akun tidak aktif'
    ]);

    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'id' => $admin['id'],
        'name' => $admin['name'],
        'status' => (bool) $admin['status'],
    ]
]);