<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$name = trim($_POST['name'] ?? '');
$notelp = trim($_POST['notelp'] ?? '');
$email = trim($_POST['email'] ?? '');
$pekerjaan = trim($_POST['pekerjaan'] ?? '');
$gate = trim($_POST['gate'] ?? '');
$role_permission = trim($_POST['role_permission'] ?? '');

// Validasi Wajib
if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nama peserta wajib diisi']);
    exit;
}

if ($notelp === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nomor telepon wajib diisi']);
    exit;
}

// Handle Upload Foto (Opsional)
$fotoPath = null;
if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['foto']['tmp_name'];
    $fileName = $_FILES['foto']['name'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (in_array($fileExtension, $allowedExtensions)) {
        $uploadFileDir = __DIR__ . '/../assets/images/';

        if (!is_dir($uploadFileDir)) {
            mkdir($uploadFileDir, 0755, true);
        }

        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
        $destPath = $uploadFileDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            $fotoPath = $newFileName;
        }
    }
}

try {
    $idRegistrasi = 'REG-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
    $idIndependent = 'IND-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));

    $stmt = $pdo->prepare("
        INSERT INTO user_peserta (id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ");

    $stmt->execute([
        $idRegistrasi,
        $idIndependent,
        $name,
        $notelp,
        $email !== '' ? $email : null,
        $fotoPath,
        $pekerjaan !== '' ? $pekerjaan : null,
        $gate !== '' ? $gate : null,
        $role_permission !== '' ? $role_permission : null
    ]);

    $newId = $pdo->lastInsertId();

    $stmt = $pdo->prepare("
        SELECT id, id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, waktu_hadir, gate, role_permission, status 
        FROM user_peserta WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$newId]);
    $newParticipant = $stmt->fetch(PDO::FETCH_ASSOC);

    $newParticipant['id'] = (int) $newParticipant['id'];
    $newParticipant['status'] = (bool) $newParticipant['status'];

    echo json_encode([
        'success' => true,
        'message' => 'Peserta berhasil ditambahkan',
        'data' => $newParticipant,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Gagal menambahkan peserta: ' . $e->getMessage()]);
}
