<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

$participant_id = $_POST['participant_id'] ?? $_GET['participant_id'] ?? null;
$id_registrasi = $_POST['id_registrasi'] ?? $_GET['id_registrasi'] ?? null;

// Jika dari raw JSON body
if (!$participant_id && !$id_registrasi) {
    $inputData = json_decode(file_get_contents("php://input"), true);
    $participant_id = $inputData['participant_id'] ?? null;
    $id_registrasi = $inputData['id_registrasi'] ?? null;
}

if (!$participant_id && !$id_registrasi) {
    echo json_encode([
        'success' => false,
        'message' => 'participant_id atau id_registrasi wajib diisi'
    ]);
    exit();
}

try {
    // Jika dikirim id_registrasi, cari dulu id primary key di user_peserta
    if (!$participant_id && $id_registrasi) {
        $stmtUser = $pdo->prepare("SELECT id FROM user_peserta WHERE id_registrasi = :id_registrasi LIMIT 1");
        $stmtUser->execute([':id_registrasi' => $id_registrasi]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $participant_id = $user['id'];
        } else {
            echo json_encode([
                'success' => true,
                'message' => 'Peserta tidak ditemukan',
                'data' => []
            ]);
            exit();
        }
    }

    // Query log berdasarkan participant_id (Primary Key integer)
    $stmt = $pdo->prepare("
        SELECT id, participant_id, activity, description, created_at 
        FROM log_activity 
        WHERE participant_id = :participant_id 
        ORDER BY id DESC
    ");
    
    $stmt->execute([':participant_id' => $participant_id]);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Berhasil mengambil log activity',
        'data' => $logs
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil log: ' . $e->getMessage()
    ]);
}
