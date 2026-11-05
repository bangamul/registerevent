<?php
/**
 * Skrip Sinkronisasi & Penambahan Data Tamu Undangan
 * Jalankan file ini melalui browser:
 * https://event-rsvp.lotusparking.my.id/trisakti/api/update_tamu.php
 */

require_once 'cors.php';
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

try {
     = [];
     = [];

    // ==============================================================================
    // 1. UPDATE JABATAN & NAMA TAMU PEJABAT BKPM (IDEMPOTENT)
    // ==============================================================================
     = [
        [
            'search' => '%HELDY SATRYA PUTERA%',
            'name' => null,
            'job' => 'Deputi Bidang Hilirisasi Investasi Strategis BKPM',
        ],
        [
            'search' => '%RIYATNO%',
            'name' => null,
            'job' => 'Deputi Bidang Pengembangan Iklim Penanaman Modal BKPM',
        ],
        [
            'search' => '%NURUL ICHWAN%',
            'name' => null,
            'job' => 'Deputi Bidang Promosi Penanaman Modal BKPM',
        ],
        [
            'search' => '%EDY JUNAEDI%',
            'name' => 'Dr. Edy Junaedi, S.STP., M.Si.',
            'job' => 'Deputi Bidang Pengendalian Pelaksanaan Penanaman Modal BKPM',
        ],
    ];

    foreach ( as ) {
        if (['name'] !== null) {
             = ->prepare("UPDATE user_peserta SET name = ?, pekerjaan = ? WHERE name LIKE ?");
            ->execute([['name'], ['job'], ['search']]);
        } else {
             = ->prepare("UPDATE user_peserta SET pekerjaan = ? WHERE name LIKE ?");
            ->execute([['job'], ['search']]);
        }
        if (->rowCount() > 0) {
            [] = ['search'];
        }
    }

    // ==============================================================================
    // 2. DATA TAMU BARU (KLHK, BAPETEN, BKPM, BALITBANG GOLKAR, ORMAS BUDDHIS & GEMABUDHI)
    // ==============================================================================
     = [
        // Batch 1: KLHK, BAPETEN, BKPM (11 Orang)
        [
            'name' => 'Ir. Noer Adi Wardojo, M.Sc',
            'job' => 'Plt. DEPUTI BIDANG PENGENDALIAN PENCEMARAN DAN KERUSAKAN LINGKUNGAN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-10A1F442',
            'ind' => 'IND-D8DC7170'
        ],
        [
            'name' => 'VINDA DAMAYANTI ANSJAR, Ssi., M.Sc',
            'job' => 'DEPUTI BIDANG PENGELOLAAN SAMPAH, LIMBAH DAN BAHAN BERBAHAYA DAN BERACUN (B3)',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-37C1F9BA',
            'ind' => 'IND-C760F044'
        ],
        [
            'name' => 'Irjen Pol Adi Deriyan Jayamarta, S.I.K., M.H',
            'job' => 'DEPUTI GAKUM LINGKUNGAN HIDUP',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-475F4EA7',
            'ind' => 'IND-3FED9D4E'
        ],
        [
            'name' => 'Komjen Pol. Winarto, S.H., M.H',
            'job' => 'IRTAMA KEMENTERIAN LINGKUNGAN HIDUP',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-16BEA6F4',
            'ind' => 'IND-BF54F979'
        ],
        [
            'name' => 'HAENDRA SUBEKTI, ST, MT',
            'job' => 'DEPUTI PENGKAJIAN KESELAMATAN NUKLIR BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-0119AA2A',
            'ind' => 'IND-4232290D'
        ],
        [
            'name' => 'MOHAMMAD RIDWAN, S.T., M.Eng',
            'job' => 'SEKRETARIS UTAMA BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-FC48110A',
            'ind' => 'IND-ABA7311C'
        ],
        [
            'name' => 'ASEP SAEFULLOH HERMAWAN, S.Si., M.T',
            'job' => 'DIREKTUR PERIZINAN FASILITAS RADIASI DAN ZAT RADIOAKTIF BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-2C7E71F8',
            'ind' => 'IND-23C82891'
        ],
        [
            'name' => 'Dr. Ir. Rudy Salahuddin, M.E.M.',
            'job' => 'Sekretaris Kementerian/Sekretaris Utama BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-51611E8B',
            'ind' => 'IND-3044E0DE'
        ],
        [
            'name' => 'Ichsan Zulkarnaen, S.E., M.Sc., Ph.D.',
            'job' => 'Deputi Bidang Perencanaan Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-FE37B9D7',
            'ind' => 'IND-96A01BF0'
        ],
        [
            'name' => 'Andi Maulana, S.E., M.M.',
            'job' => 'Deputi Bidang Pelayanan Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-16ED1BF8',
            'ind' => 'IND-A058A84D'
        ],
        [
            'name' => 'Siti Romayah, S. Kom., M.M.',
            'job' => 'Deputi Bidang Teknologi Informasi Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-95F88632',
            'ind' => 'IND-C17B6BEF'
        ],
        // Batch 2: BALITBANG GOLKAR (3 Orang)
        [
            'name' => 'RUSDI',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-CFC539ED',
            'ind' => 'IND-83CB4415'
        ],
        [
            'name' => 'YURISMAN',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-85124129',
            'ind' => 'IND-2E2E3CCD'
        ],
        [
            'name' => 'MUTMAINNAH',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-2ADFE7FE',
            'ind' => 'IND-39912A66'
        ],
        // Batch 3: Tokoh Ormas Buddhis & Gemabudhi (26 Orang)
        [
            'name' => 'David Herman Jaya',
            'job' => 'Ketum LPTG N',
            'notelp' => '0816811051',
            'jalur' => 'blast',
            'reg' => 'REG-95C0B2C3',
            'ind' => 'IND-96DF3705'
        ],
        [
            'name' => 'Dharmanadi Chandra',
            'job' => 'Ketum Magabudhi',
            'notelp' => '085285528662',
            'jalur' => 'blast',
            'reg' => 'REG-F273F801',
            'ind' => 'IND-E421788E'
        ],
        [
            'name' => 'Andi Rojali',
            'job' => 'Ketum Mahasi',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-26DA6ABC',
            'ind' => 'IND-DD9AE701'
        ],
        [
            'name' => 'Romo Citra Surya',
            'job' => 'Ketum Mapanbumi',
            'notelp' => '08121061163',
            'jalur' => 'blast',
            'reg' => 'REG-97B2D3C5',
            'ind' => 'IND-7F1B7718'
        ],
        [
            'name' => 'Aiko Senosoenoto',
            'job' => 'Ketum MNSBDI',
            'notelp' => '0811926411',
            'jalur' => 'blast',
            'reg' => 'REG-16463CD0',
            'ind' => 'IND-77E508C7'
        ],
        [
            'name' => 'Amin Untario',
            'job' => 'Ketum MBI',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-6D4C479B',
            'ind' => 'IND-AA3CBE8C'
        ],
        [
            'name' => 'Hong Tjin',
            'job' => 'Tzu Chi',
            'notelp' => '08811235678',
            'jalur' => 'blast',
            'reg' => 'REG-EF4DB9C7',
            'ind' => 'IND-7D10DFAC'
        ],
        [
            'name' => 'Rahmat Harsono',
            'job' => 'Permabudhi / IKAL',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-207A2C58',
            'ind' => 'IND-429DA8FA'
        ],
        [
            'name' => 'Winarso',
            'job' => 'Tzu Chi',
            'notelp' => '081806364999',
            'jalur' => 'blast',
            'reg' => 'REG-35933900',
            'ind' => 'IND-91D2772D'
        ],
        [
            'name' => 'Judha Hartono',
            'job' => 'Magabudhi',
            'notelp' => '08161890042',
            'jalur' => 'blast',
            'reg' => 'REG-A43DC794',
            'ind' => 'IND-B4C3BC53'
        ],
        [
            'name' => 'Erwin Tjioe',
            'job' => 'Matrisia',
            'notelp' => '0816725709',
            'jalur' => 'blast',
            'reg' => 'REG-4D1BBF79',
            'ind' => 'IND-B8172E90'
        ],
        [
            'name' => 'Alim Sudio',
            'job' => 'MNSBDI',
            'notelp' => '08159798078',
            'jalur' => 'blast',
            'reg' => 'REG-89634453',
            'ind' => 'IND-189262A5'
        ],
        [
            'name' => 'Rosmary',
            'job' => 'Magabudhi',
            'notelp' => '0811961878',
            'jalur' => 'blast',
            'reg' => 'REG-4ED0303A',
            'ind' => 'IND-4A708D85'
        ],
        [
            'name' => 'Piandi',
            'job' => 'MBI',
            'notelp' => '081388778778',
            'jalur' => 'blast',
            'reg' => 'REG-28429D1B',
            'ind' => 'IND-FE709FE4'
        ],
        [
            'name' => 'Romo M Canto Santoso',
            'job' => 'MBI',
            'notelp' => '081807882259',
            'jalur' => 'blast',
            'reg' => 'REG-D2C5FD4D',
            'ind' => 'IND-28024C72'
        ],
        [
            'name' => 'Pramana Winardi',
            'job' => 'Gemabudhi',
            'notelp' => '0818913719',
            'jalur' => 'blast',
            'reg' => 'REG-93D47B84',
            'ind' => 'IND-076CA672'
        ],
        [
            'name' => 'Edi Rahmawijaya Putra',
            'job' => 'Gemabudhi',
            'notelp' => '0818870511',
            'jalur' => 'blast',
            'reg' => 'REG-4B299F36',
            'ind' => 'IND-C2603A85'
        ],
        [
            'name' => 'Anes Dwi Prasetya',
            'job' => 'Gemabudhi',
            'notelp' => '087884408933',
            'jalur' => 'blast',
            'reg' => 'REG-3B67F7BC',
            'ind' => 'IND-3D2E5E0D'
        ],
        [
            'name' => 'Liedya Angowijaya',
            'job' => 'Gemabudhi',
            'notelp' => '089669996909',
            'jalur' => 'blast',
            'reg' => 'REG-AB55C8FC',
            'ind' => 'IND-EE303309'
        ],
        [
            'name' => 'Widhia Seni',
            'job' => 'Gemabudhi',
            'notelp' => '085640631686',
            'jalur' => 'blast',
            'reg' => 'REG-14CFD725',
            'ind' => 'IND-64489473'
        ],
        [
            'name' => 'Netta Hartini',
            'job' => 'Gemabudhi',
            'notelp' => '08998814797',
            'jalur' => 'blast',
            'reg' => 'REG-E5C984A4',
            'ind' => 'IND-57FB6A10'
        ],
        [
            'name' => 'Aili',
            'job' => 'Gemabudhi',
            'notelp' => '089619978789',
            'jalur' => 'blast',
            'reg' => 'REG-2367C12D',
            'ind' => 'IND-884D5E5E'
        ],
        [
            'name' => 'dr. Herna',
            'job' => 'Gemabudhi',
            'notelp' => '082310453683',
            'jalur' => 'blast',
            'reg' => 'REG-86437E26',
            'ind' => 'IND-79D85DCC'
        ],
        [
            'name' => 'Karsono Lismanto',
            'job' => 'Gemabudhi',
            'notelp' => '085289026486',
            'jalur' => 'blast',
            'reg' => 'REG-DDD4BA58',
            'ind' => 'IND-A9304292'
        ],
        [
            'name' => 'Aman Budi Manduro',
            'job' => 'Gemabudhi',
            'notelp' => '087799643463',
            'jalur' => 'blast',
            'reg' => 'REG-39A29856',
            'ind' => 'IND-DE9228CC'
        ],
        [
            'name' => 'dr. Yantony Wijaya',
            'job' => 'Gemabudhi',
            'notelp' => '081298022201',
            'jalur' => 'blast',
            'reg' => 'REG-2E4C671A',
            'ind' => 'IND-04990496'
        ],
    ];

     = ->prepare("SELECT id FROM user_peserta WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
     = ->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, ?, ?,
            '1', '1', 0, 'pending', ?, 'unsent', 'unclaimed'
        )
    ");

    foreach ( as ) {
        ->execute([['name']]);
         = ->fetchColumn();

        if (!) {
            ->execute([
                ['reg'],
                ['ind'],
                ['name'],
                ['notelp'] ?? '',
                ['job'],
                ['jalur'] ?? 'manual'
            ]);
            [] = ['name'];
        }
    }

    // ==============================================================================
    // 4. TAMBAH 7 TAMU VIP BALITBANG GOLKAR (KONFIRMASI LANGSUNG KE TUAN RUMAH)
    // Status langsung 'confirmed', waktu_konfirmasi = NOW(), jalur = 'manual'
    // ==============================================================================
    $tamuVipGolkar = [
        [
            'name' => 'Prof. Dr. Yuddy Chrisnandi, SH., SE., MSi',
            'job' => 'KETUA BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-037FD1E5',
            'ind' => 'IND-19E42B01',
        ],
        [
            'name' => 'Prof. Dr. Drs. Ganjar Razuni, SH., MSi',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-CEC00749',
            'ind' => 'IND-7A8B429F',
        ],
        [
            'name' => 'Amir A. Gofur, SE., MSi',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-5C08AE8A',
            'ind' => 'IND-628D3F11',
        ],
        [
            'name' => 'Bambang Susilo, AMd',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-9B0A28E9',
            'ind' => 'IND-43C92B56',
        ],
        [
            'name' => 'Prof. Dr. Bomer Pasaribu',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-DD4F2E45',
            'ind' => 'IND-3E77C189',
        ],
        [
            'name' => 'Dr. Syafrizal Rambe',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-BBCAF3A4',
            'ind' => 'IND-9A5C7721',
        ],
        [
            'name' => 'Leriadi, S.IP., M.IP',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-73D8666F',
            'ind' => 'IND-5DF081A4',
        ],
    ];

    $stmtInsertVip = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, waktu_konfirmasi, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'confirmed', NOW(), 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuVipGolkar as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertVip->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'] . ' (VIP Hadir Langsung)';
        }
    }

     = ->query("SELECT COUNT(*) FROM user_peserta")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Data tamu berhasil diperbarui dan ditambahkan!',
        'updated_count' => count(),
        'inserted_count' => count(),
        'inserted_names' => ,
        'total_tamu_sekarang' => (int) 
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

} catch (Exception ) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui data: ' . ->getMessage()
    ]);
}
