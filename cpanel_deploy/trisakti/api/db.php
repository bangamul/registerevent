<?php

// Konfigurasi Database cPanel Rumahweb
// Di cPanel, nama database & username biasanya diawali prefix username cPanel (contoh: usercpanel_trisakti)
$host = 'localhost';
$dbname = 'trisakti';     // Sesuaikan dengan nama database di cPanel
$username = 'root';       // Sesuaikan dengan user database di cPanel
$password = '';           // Sesuaikan dengan password user database di cPanel

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
    ]);

    exit;
}