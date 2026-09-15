<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$idRegistrasi = trim($_POST['id_registrasi'] ?? '');

if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID registrasi wajib diisi',
    ]);
    exit;
}

// Validasi Berkas Foto
if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'File foto wajib diunggah',
    ]);
    exit;
}

$file = $_FILES['foto'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP',
    ]);
    exit;
}

// Maksimal 5MB
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Ukuran file maksimal 5MB',
    ]);
    exit;
}

try {
    // Cari peserta terlebih dahulu
    $stmt = $pdo->prepare("SELECT id, foto FROM user_peserta WHERE id_registrasi = ? LIMIT 1");
    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$peserta) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Data peserta tidak ditemukan',
        ]);
        exit;
    }

    // Path absolut folder htdocs XAMPP Linux kamu
    $uploadDir = '/opt/lampp/htdocs/trisakti/assets/images/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Generate nama file unik
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'foto_' . time() . '_' . uniqid() . '.' . $extension;
    $targetPath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Gagal menyimpan file ke server. Periksa permission folder htdocs.');
    }

    // Hapus foto lama jika ada
    if (!empty($peserta['foto'])) {
        $oldPhotoPath = $uploadDir . basename($peserta['foto']);
        if (file_exists($oldPhotoPath) && is_file($oldPhotoPath)) {
            @unlink($oldPhotoPath);
        }
    }

    // Update DB (Simpan nama filenya saja)
    $stmt = $pdo->prepare("UPDATE user_peserta SET foto = ? WHERE id = ?");
    $stmt->execute([$filename, $peserta['id']]);

    // Ambil data terbaru
    $stmt = $pdo->prepare("
        SELECT id, id_registrasi, id_independent, name, notelp, email, foto, pekerjaan, waktu_hadir, status 
        FROM user_peserta WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$peserta['id']]);
    $updatedParticipant = $stmt->fetch(PDO::FETCH_ASSOC);

    $updatedParticipant['id'] = (int) $updatedParticipant['id'];
    $updatedParticipant['status'] = (bool) $updatedParticipant['status'];

    echo json_encode([
        'success' => true,
        'message' => 'Foto berhasil diperbarui',
        'data' => $updatedParticipant,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
