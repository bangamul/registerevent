<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$idRegistrasi = trim($_POST['id_registrasi'] ?? $_GET['id_registrasi'] ?? '');
$adminId = trim($_POST['user_admin_id'] ?? $_POST['user_id'] ?? '1');
$petugas = trim($_POST['petugas_name'] ?? 'Petugas Souvenir');
$force = isset($_POST['force']) && ($_POST['force'] === '1' || $_POST['force'] === 'true');

if ($idRegistrasi === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'code' => 'EMPTY_ID',
        'message' => 'ID registrasi atau QR code wajib diisi',
    ]);
    exit;
}

try {
    // 1. Cek Pengaturan Waktu & Status Booth Souvenir
    $stmtSettings = $pdo->query("SELECT setting_key, setting_value FROM event_settings WHERE setting_key LIKE 'souvenir_%'");
    $settings = $stmtSettings->fetchAll(PDO::FETCH_KEY_PAIR);

    $mode = $settings['souvenir_mode'] ?? 'auto';
    $startTime = $settings['souvenir_start_time'] ?? '17:00';
    $startDate = $settings['souvenir_start_date'] ?? '2026-11-09';

    // Validasi Waktu / State Booth (Kecuali jika admin menggunakan flag force)
    if (!$force) {
        if ($mode === 'closed') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'code' => 'BOOTH_CLOSED',
                'message' => 'Pengambilan souvenir saat ini sedang DITUTUP oleh panitia.',
            ]);
            exit;
        }

        if ($mode === 'auto') {
            $now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));
            $targetDateTime = DateTime::createFromFormat('Y-m-d H:i', "$startDate $startTime", new DateTimeZone('Asia/Jakarta'));
            if (!$targetDateTime) {
                $targetDateTime = DateTime::createFromFormat('H:i', $startTime, new DateTimeZone('Asia/Jakarta'));
            }

            if ($targetDateTime && $now < $targetDateTime) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'code' => 'NOT_STARTED_YET',
                    'message' => "Pengambilan souvenir belum dibuka! Jadwal pengambilan dibuka mulai pukul {$startTime} WIB.",
                    'data' => [
                        'scheduled_time' => $startTime,
                        'scheduled_date' => $startDate,
                        'current_time' => $now->format('H:i:s'),
                    ]
                ]);
                exit;
            }
        }
    }

    // 2. Ambil Data Peserta berdasarkan ID Registrasi atau ID Independent
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
            waktu_souvenir,
            souvenir_status,
            souvenir_petugas,
            status,
            rsvp_status,
            jalur_undangan
        FROM user_peserta
        WHERE id_registrasi = ? OR id_independent = ?
        LIMIT 1
    ");
    $stmt->execute([$idRegistrasi, $idRegistrasi]);
    $peserta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$peserta) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'code' => 'NOT_FOUND',
            'message' => "Peserta dengan ID '$idRegistrasi' tidak terdaftar.",
        ]);
        exit;
    }

    // 3. Validasi: Apakah QR Code sudah pernah dipakai untuk ambil souvenir?
    if ($peserta['waktu_souvenir'] !== null || $peserta['souvenir_status'] === 'claimed') {
        http_response_code(409); // Conflict / Already Claimed
        echo json_encode([
            'success' => false,
            'code' => 'ALREADY_CLAIMED',
            'message' => "SOUVENIR SUDAH DIAMBIL! Peserta ini telah mengambil souvenir sebelumnya.",
            'data' => [
                'id_registrasi' => $peserta['id_registrasi'],
                'name' => $peserta['name'],
                'pekerjaan' => $peserta['pekerjaan'],
                'foto' => $peserta['foto'],
                'waktu_souvenir' => $peserta['waktu_souvenir'],
                'souvenir_petugas' => $peserta['souvenir_petugas'],
            ]
        ]);
        exit;
    }

    // 4. Proses Klaim Souvenir (Update Atomic dengan pencegahan race condition)
    $stmtUpdate = $pdo->prepare("
        UPDATE user_peserta
        SET 
            waktu_souvenir = NOW(),
            souvenir_status = 'claimed',
            souvenir_petugas = ?
        WHERE id = ? AND waktu_souvenir IS NULL
    ");
    $stmtUpdate->execute([$petugas, $peserta['id']]);

    if ($stmtUpdate->rowCount() === 0) {
        // Terjadi race condition (sudah di-scan bersamaan)
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'code' => 'ALREADY_CLAIMED',
            'message' => "SOUVENIR SUDAH DIAMBIL! Peserta baru saja mengambil souvenir.",
        ]);
        exit;
    }

    // 5. Catat Log Activity
    $stmtLog = $pdo->prepare("
        INSERT INTO log_activity (
            user_admin_id,
            participant_id,
            activity,
            description
        ) VALUES (?, ?, ?, ?)
    ");
    $description = sprintf(
        'Pengambilan souvenir peserta %s (%s) oleh petugas: %s',
        $peserta['name'],
        $peserta['id_registrasi'],
        $petugas
    );
    $stmtLog->execute([
        (int) $adminId,
        $peserta['id'],
        'SOUVENIR_CLAIMED',
        $description
    ]);

    // 6. Ambil data mutakhir setelah klaim
    $stmtFresh = $pdo->prepare("
        SELECT 
            id,
            id_registrasi,
            name,
            notelp,
            foto,
            pekerjaan,
            waktu_hadir,
            waktu_souvenir,
            souvenir_status,
            souvenir_petugas
        FROM user_peserta
        WHERE id = ?
    ");
    $stmtFresh->execute([$peserta['id']]);
    $updatedData = $stmtFresh->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'code' => 'SUCCESS',
        'message' => "Souvenir berhasil diberikan kepada {$peserta['name']}!",
        'data' => $updatedData
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'code' => 'SERVER_ERROR',
        'message' => 'Terjadi kesalahan sistem saat memproses souvenir: ' . $e->getMessage(),
    ]);
}
