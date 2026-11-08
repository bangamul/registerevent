<?php

require_once 'cors.php';
header('Content-Type: application/json');

require_once 'db.php';

$idRegistrasi = trim($_POST['id_registrasi'] ?? $_GET['id_registrasi'] ?? '');
$notelp = trim($_POST['notelp'] ?? $_GET['notelp'] ?? '');

if (!$idRegistrasi && !$notelp) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID registrasi atau nomor telepon wajib diisi'
    ]);
    exit;
}

$query = "
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
        waktu_konfirmasi,
        waktu_kirim_wa,
        wa_status,
        gate,
        role_permission,
        status,
        rsvp_status,
        COALESCE(jalur_undangan, 'blast') as jalur_undangan,
        waktu_souvenir,
        COALESCE(souvenir_status, 'unclaimed') as souvenir_status,
        souvenir_petugas,
        seating_arrangement
    FROM user_peserta
    WHERE 
";

$params = [];
if ($idRegistrasi !== '') {
    $query .= "id_registrasi = ? LIMIT 1";
    $params[] = $idRegistrasi;
} else {
    $cleanPhone = preg_replace('/\D/', '', $notelp);
    $variants = array_unique(array_filter([
        $notelp,
        $cleanPhone,
        str_starts_with($cleanPhone, '0') ? '62' . substr($cleanPhone, 1) : '',
        str_starts_with($cleanPhone, '62') ? '0' . substr($cleanPhone, 2) : '',
    ]));
    $placeholders = implode(',', array_fill(0, count($variants), '?'));
    $query .= "notelp IN ($placeholders) LIMIT 1";
    $params = array_values($variants);
}

$stmt = $pdo->prepare($query);
$stmt->execute($params);

$peserta = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$peserta) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Data peserta tidak ditemukan'
    ]);
    exit;
}

$peserta['status'] = (bool) $peserta['status'];

echo json_encode([
    'success' => true,
    'data' => $peserta
]);
