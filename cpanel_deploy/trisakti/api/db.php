<?php

// Konfigurasi Database cPanel Rumahweb
$host = 'localhost';
$dbname = 'lotx4132_event-rspv';
$username = 'lotx4132_event-rsvp-user';
$password = '3v3ntrsvp';

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