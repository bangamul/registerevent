<?php

require_once 'cors.php';
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'db.php';

try {
    // 1. Ringkasan Total Real-Time
    $stmtSummary = $pdo->query("
        SELECT 
            COUNT(*) as total_peserta,
            SUM(CASE WHEN wa_status = 'sent' THEN 1 ELSE 0 END) as wa_terkirim,
            SUM(CASE WHEN wa_status != 'sent' OR wa_status IS NULL THEN 1 ELSE 0 END) as wa_belum_terkirim,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(rsvp_status, ''))) = 'confirmed' OR (status = 1 AND LOWER(TRIM(COALESCE(rsvp_status, ''))) != 'declined') THEN 1 ELSE 0 END) as rsvp_hadir,
            SUM(CASE WHEN LOWER(TRIM(COALESCE(rsvp_status, ''))) = 'declined' THEN 1 ELSE 0 END) as rsvp_berhalangan,
            SUM(CASE WHEN rsvp_status = 'pending' OR rsvp_status IS NULL THEN 1 ELSE 0 END) as rsvp_pending,
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as hadir_venue,
            SUM(CASE WHEN status = 0 OR status IS NULL THEN 1 ELSE 0 END) as belum_hadir_venue,
            SUM(CASE WHEN jalur_undangan = 'manual' THEN 1 ELSE 0 END) as jalur_manual,
            SUM(CASE WHEN jalur_undangan = 'blast' OR jalur_undangan IS NULL THEN 1 ELSE 0 END) as jalur_blast,
            SUM(CASE WHEN souvenir_status = 'claimed' OR waktu_souvenir IS NOT NULL THEN 1 ELSE 0 END) as souvenir_diambil,
            SUM(CASE WHEN (souvenir_status != 'claimed' OR souvenir_status IS NULL) AND waktu_souvenir IS NULL THEN 1 ELSE 0 END) as souvenir_belum_diambil
        FROM user_peserta
    ");
    $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);

    $total = (int) ($summary['total_peserta'] ?? 0);
    $waTerkirim = (int) ($summary['wa_terkirim'] ?? 0);
    $waPersentase = $total > 0 ? round(($waTerkirim / $total) * 100, 1) : 0;

    $summary['total_peserta'] = $total;
    $summary['wa_terkirim'] = $waTerkirim;
    $summary['wa_belum_terkirim'] = (int) ($summary['wa_belum_terkirim'] ?? 0);
    $summary['wa_persentase'] = $waPersentase;
    $summary['rsvp_hadir'] = (int) ($summary['rsvp_hadir'] ?? 0);
    $summary['rsvp_berhalangan'] = (int) ($summary['rsvp_berhalangan'] ?? 0);
    $summary['rsvp_pending'] = (int) ($summary['rsvp_pending'] ?? 0);
    $summary['hadir_venue'] = (int) ($summary['hadir_venue'] ?? 0);
    $summary['belum_hadir_venue'] = (int) ($summary['belum_hadir_venue'] ?? 0);
    $summary['jalur_manual'] = (int) ($summary['jalur_manual'] ?? 0);
    $summary['jalur_blast'] = (int) ($summary['jalur_blast'] ?? 0);
    $summary['souvenir_diambil'] = (int) ($summary['souvenir_diambil'] ?? 0);
    $summary['souvenir_belum_diambil'] = (int) ($summary['souvenir_belum_diambil'] ?? 0);

    // 2. Breakdown Pengiriman & RSVP Per Tanggal
    $stmtDailyWa = $pdo->query("
        SELECT 
            DATE(waktu_kirim_wa) as tanggal,
            COUNT(*) as jumlah_kirim
        FROM user_peserta
        WHERE waktu_kirim_wa IS NOT NULL
        GROUP BY DATE(waktu_kirim_wa)
        ORDER BY tanggal DESC
    ");
    $dailyWa = $stmtDailyWa->fetchAll(PDO::FETCH_ASSOC);

    $stmtDailyRsvp = $pdo->query("
        SELECT 
            DATE(waktu_konfirmasi) as tanggal,
            COUNT(*) as jumlah_rsvp
        FROM user_peserta
        WHERE waktu_konfirmasi IS NOT NULL AND rsvp_status = 'confirmed'
        GROUP BY DATE(waktu_konfirmasi)
        ORDER BY tanggal DESC
    ");
    $dailyRsvp = $stmtDailyRsvp->fetchAll(PDO::FETCH_ASSOC);

    // Gabungkan statistik per tanggal
    $datesMap = [];
    foreach ($dailyWa as $item) {
        $tgl = $item['tanggal'];
        if (!isset($datesMap[$tgl])) {
            $datesMap[$tgl] = ['tanggal' => $tgl, 'wa_terkirim' => 0, 'rsvp_hadir' => 0];
        }
        $datesMap[$tgl]['wa_terkirim'] = (int) $item['jumlah_kirim'];
    }

    foreach ($dailyRsvp as $item) {
        $tgl = $item['tanggal'];
        if (!isset($datesMap[$tgl])) {
            $datesMap[$tgl] = ['tanggal' => $tgl, 'wa_terkirim' => 0, 'rsvp_hadir' => 0];
        }
        $datesMap[$tgl]['rsvp_hadir'] = (int) $item['jumlah_rsvp'];
    }

    krsort($datesMap);
    $dailyBreakdown = array_values($datesMap);

    // 3. Log Riwayat Terbaru (25 Log Terakhir)
    $stmtLogs = $pdo->query("
        SELECT 
            l.id,
            l.activity,
            l.description,
            l.created_at,
            p.name as participant_name,
            p.notelp as participant_phone,
            p.id_registrasi
        FROM log_activity l
        LEFT JOIN user_peserta p ON l.participant_id = p.id
        ORDER BY l.created_at DESC
        LIMIT 25
    ");
    $recentLogs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    // 4. Detail Tamu Konfirmasi Hadir
    $stmtTamuHadir = $pdo->query("
        SELECT 
            id,
            id_registrasi,
            name,
            notelp,
            pekerjaan,
            waktu_konfirmasi,
            jalur_undangan,
            gate,
            status as checkin_status,
            souvenir_status
        FROM user_peserta
        WHERE LOWER(TRIM(COALESCE(rsvp_status, ''))) = 'confirmed'
           OR (status = 1 AND LOWER(TRIM(COALESCE(rsvp_status, ''))) != 'declined')
        ORDER BY waktu_konfirmasi DESC, name ASC
    ");
    $tamuHadir = $stmtTamuHadir->fetchAll(PDO::FETCH_ASSOC);

    // 5. Detail Tamu Konfirmasi Berhalangan
    $stmtTamuBerhalangan = $pdo->query("
        SELECT 
            id,
            id_registrasi,
            name,
            notelp,
            pekerjaan,
            waktu_konfirmasi,
            jalur_undangan
        FROM user_peserta
        WHERE LOWER(TRIM(COALESCE(rsvp_status, ''))) = 'declined'
        ORDER BY waktu_konfirmasi DESC, name ASC
    ");
    $tamuBerhalangan = $stmtTamuBerhalangan->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'daily_breakdown' => $dailyBreakdown,
        'recent_logs' => $recentLogs,
        'tamu_hadir' => $tamuHadir,
        'tamu_berhalangan' => $tamuBerhalangan,
        'generated_at' => date('Y-m-d H:i:s'),
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Gagal mengambil laporan: ' . $e->getMessage()]);
}
