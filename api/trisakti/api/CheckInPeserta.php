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
$userAdminId  = $_POST['user_admin_id'] ?? '';
// 💡 Tangkap parameter sesi (default 1 jika tidak dikirim)
$sesi         = isset($_POST['sesi']) ? (int) $_POST['sesi'] : 1;

// Validate ID Registrasi
if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID registrasi wajib diisi',
    ]);
    exit;
}

// Validate User Admin
if ($userAdminId === '' || !filter_var($userAdminId, FILTER_VALIDATE_INT)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'User admin tidak valid',
    ]);
    exit;
}

$userAdminId = (int) $userAdminId;

try {
    $pdo->beginTransaction();

    /*
     * 💡 1. Cari peserta (Tambahkan waktu_sesi_2)
     */
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
        WHERE id_registrasi = ?
        LIMIT 1
    ");

    $stmt->execute([$idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    /*
     * Peserta tidak ditemukan
     */
    if (!$peserta) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Data peserta tidak ditemukan',
        ]);
        exit;
    }

    /*
     * 💡 3. Update status kehadiran sesuai Sesi
     * Timestamp hanya diisi pada scan pertama sesi tersebut. Scan berikutnya
     * tetap dilanjutkan ke pencatatan log di bawah.
     */
    if ($sesi === 2) {
        $updateQuery = "
            UPDATE user_peserta
            SET waktu_sesi_2 = NOW()
            WHERE id = ? AND waktu_sesi_2 IS NULL
        ";
    } else {
        $updateQuery = "
            UPDATE user_peserta
            SET status = TRUE, waktu_hadir = NOW()
            WHERE id = ? AND waktu_hadir IS NULL
        ";
    }

    $stmt = $pdo->prepare($updateQuery);
    $stmt->execute([$peserta['id']]);

    /*
     * Simpan log activity
     */
    $stmt = $pdo->prepare("
        INSERT INTO log_activity (
            user_admin_id,
            participant_id,
            activity,
            description
        ) VALUES (?, ?, ?, ?)
    ");

    $description = sprintf(
        'Validasi kehadiran Sesi %d peserta %s (%s)',
        $sesi,
        $peserta['name'],
        $peserta['id_registrasi']
    );

    $stmt->execute([
        $userAdminId,
        $peserta['id'],
        "CHECK_IN_SESI_{$sesi}",
        $description,
    ]);

    /*
     * 💡 4. Ambil kembali data peserta terbaru (sertakan waktu_sesi_2)
     */
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
        WHERE id = ?
        LIMIT 1
    ");

    $stmt->execute([$peserta['id']]);
    $updatedParticipant = $stmt->fetch(PDO::FETCH_ASSOC);

    /*
     * Commit transaction
     */
    $pdo->commit();

    /*
     * Formatting type data JSON
     */
    $updatedParticipant['id']     = (int) $updatedParticipant['id'];
    $updatedParticipant['status'] = (bool) $updatedParticipant['status'];

    echo json_encode([
        'success' => true,
        'message' => "Kehadiran Sesi {$sesi} peserta berhasil divalidasi",
        'data'    => $updatedParticipant,
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memvalidasi kehadiran peserta',
    ]);
}
