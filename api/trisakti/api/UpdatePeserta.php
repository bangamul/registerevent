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

$idRegistrasi = trim($_POST['id_registrasi'] ?? '');
$name = trim($_POST['name'] ?? '');
$notelp = trim($_POST['notelp'] ?? '');
$email = trim($_POST['email'] ?? '');
$pekerjaan = trim($_POST['pekerjaan'] ?? '');
$gate = trim($_POST['gate'] ?? '1');
$role_permission = trim($_POST['role_permission'] ?? '1');

// Validasi input
if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID registrasi wajib diisi']);
    exit;
}

if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nama wajib diisi']);
    exit;
}

try {
    // Cari peserta
    $stmt = $pdo->prepare("SELECT id FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$peserta) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Data peserta tidak ditemukan']);
        exit;
    }

    // Update data peserta
    $stmt = $pdo->prepare("
        UPDATE user_peserta 
        SET 
            name = ?, 
            notelp = ?, 
            email = ?, 
            pekerjaan = ?, 
            gate = ?,
            role_permission = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $name,
        $notelp,
        $email !== '' ? $email : null,
        $pekerjaan !== '' ? $pekerjaan : null,
        $gate !== '' ? (int) $gate : 1,
        $role_permission !== '' ? (int) $role_permission : 1,
        $peserta['id']
    ]);

    // Ambil data terbaru untuk dikembalikan ke frontend
    $stmt = $pdo->prepare("
        SELECT id, id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, waktu_hadir, gate, role_permission, status 
        FROM user_peserta WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$peserta['id']]);
    $updatedParticipant = $stmt->fetch(PDO::FETCH_ASSOC);

    // Casting tipe data agar sesuai dengan TypeScript interface
    $updatedParticipant['id'] = (int) $updatedParticipant['id'];
    $updatedParticipant['status'] = (bool) $updatedParticipant['status'];
    $updatedParticipant['gate'] = $updatedParticipant['gate'] !== null ? (int) $updatedParticipant['gate'] : 1;
    $updatedParticipant['role_permission'] = $updatedParticipant['role_permission'] !== null ? (int) $updatedParticipant['role_permission'] : 1;

    echo json_encode([
        'success' => true,
        'message' => 'Data peserta berhasil diperbarui',
        'data' => $updatedParticipant,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Gagal memperbarui data peserta']);
}
