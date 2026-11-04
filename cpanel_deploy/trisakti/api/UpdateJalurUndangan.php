<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$rawBody = file_get_contents('php://input');
$jsonBody = json_decode($rawBody, true) ?? [];

$id = $_POST['id'] ?? $jsonBody['id'] ?? null;
$ids = $_POST['ids'] ?? $jsonBody['ids'] ?? null;
$idRegistrasi = $_POST['id_registrasi'] ?? $jsonBody['id_registrasi'] ?? null;
$jalur = $_POST['jalur_undangan'] ?? $_POST['jalur'] ?? $jsonBody['jalur_undangan'] ?? $jsonBody['jalur'] ?? 'blast';

// Validasi jalur
if (!in_array($jalur, ['blast', 'manual'])) {
    $jalur = 'blast';
}

$targetIds = [];

if (is_array($ids)) {
    $targetIds = array_map('intval', $ids);
} elseif (is_string($ids) && str_contains($ids, ',')) {
    $targetIds = array_map('intval', explode(',', $ids));
} elseif ($id) {
    $targetIds = [(int) $id];
} elseif ($idRegistrasi) {
    $stmtFind = $pdo->prepare("SELECT id FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmtFind->execute([$idRegistrasi]);
    $found = $stmtFind->fetch(PDO::FETCH_ASSOC);
    if ($found) {
        $targetIds = [(int) $found['id']];
    }
}

if (empty($targetIds)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Parameter id, ids, atau id_registrasi wajib disertakan'
    ]);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($targetIds), '?'));
    $params = array_merge([$jalur], $targetIds);

    $stmt = $pdo->prepare("
        UPDATE user_peserta
        SET jalur_undangan = ?
        WHERE id IN ($placeholders)
    ");
    $stmt->execute($params);

    $count = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'message' => "Jalur undangan berhasil diperbarui menjadi '$jalur' untuk $count peserta.",
        'updated_count' => $count,
        'jalur' => $jalur
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui jalur undangan: ' . $e->getMessage()
    ]);
}
