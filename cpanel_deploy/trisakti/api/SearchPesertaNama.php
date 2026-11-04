<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$q = trim($_GET['q'] ?? $_POST['q'] ?? $_GET['name'] ?? $_POST['name'] ?? '');

if (mb_strlen($q) < 1) {
    echo json_encode(['success' => true, 'data' => []]);
    exit;
}

try {
    $searchTerm = "%$q%";
    $stmt = $pdo->prepare("
        SELECT 
            id,
            id_registrasi,
            id_independent,
            name,
            notelp,
            email,
            pekerjaan,
            gate,
            role_permission,
            rsvp_status,
            waktu_konfirmasi,
            waktu_souvenir,
            souvenir_status,
            status
        FROM user_peserta
        WHERE name LIKE ? OR notelp LIKE ? OR pekerjaan LIKE ?
        ORDER BY 
            CASE 
                WHEN name LIKE ? THEN 1
                WHEN name LIKE ? THEN 2
                ELSE 3
            END,
            name ASC
        LIMIT 10
    ");
    $stmt->execute([
        $searchTerm,
        $searchTerm,
        $searchTerm,
        "$q%",  // Prioritas 1: Nama diawali kata kunci
        "%$q%", // Prioritas 2: Nama mengandung kata kunci
    ]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $results,
        'total' => count($results)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mencari data peserta: ' . $e->getMessage()
    ]);
}
