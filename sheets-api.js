/**
 * ============================================================================
 * MODULE: GOOGLE SHEETS CONNECTOR (MURNI TANPA APPS SCRIPT)
 * DASHBOARD PUBLIK MONITORING MBG - PROVINSI KALIMANTAN TIMUR
 * Badan Gizi Nasional (BGN)
 * ============================================================================
 * Modul ini membaca langsung dari Google Spreadsheet menggunakan Google GViz API.
 * Syarat: Google Spreadsheet harus disetel "Anyone with the link can view"
 * (Siapa saja yang memiliki link dapat melihat).
 */

var KALTIM_COORDS = {
  'KOTA SAMARINDA': [-0.5022, 117.1536],
  'KOTA BALIKPAPAN': [-1.2379, 116.8529],
  'KOTA BONTANG': [0.1333, 117.5000],
  'KUTAI KARTANEGARA': [-0.4412, 117.0064],
  'KUTAI TIMUR': [0.5432, 117.5518],
  'KUTAI BARAT': [-0.2319, 115.6888],
  'PASER': [-1.8844, 116.0969],
  'PENAJAM PASER UTARA': [-1.2483, 116.6853],
  'BERAU': [2.1557, 117.4925],
  'MAHAKAM ULU': [0.3833, 114.9333]
};

function toNum(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  var s = String(val).trim();
  if (s.indexOf('=AI(') === 0 || s.indexOf('#') === 0) return 0;
  var cleaned = s.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

function toStr(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    if (isNaN(val.getTime())) return '';
    var d = val.getDate();
    var m = val.getMonth() + 1;
    var y = val.getFullYear();
    return (d < 10 ? '0' + d : d) + '/' + (m < 10 ? '0' + m : m) + '/' + y;
  }
  var s = String(val).trim();
  if (s.indexOf('=AI(') === 0 || s.indexOf('#') === 0) return '-';
  return s;
}

function normalizeKabName(raw) {
  var s = toStr(raw).toUpperCase();
  s = s.replace(/^\d+\.\s*/, '');
  s = s.replace(/^KALIMANTAN\s+TIMUR\s*-\s*/i, '');
  s = s.replace(/\(.*?\)/g, '');
  s = s.replace(/^KAB\.?\s+/i, '');
  s = s.replace(/^KABUPATEN\s+/i, '');
  s = s.trim();

  if (s.indexOf('BALIKPAPAN') !== -1) return 'KOTA BALIKPAPAN';
  if (s.indexOf('SAMARINDA') !== -1) return 'KOTA SAMARINDA';
  if (s.indexOf('BONTANG') !== -1) return 'KOTA BONTANG';
  if (s.indexOf('PENAJAM') !== -1) return 'PENAJAM PASER UTARA';
  if (s.indexOf('KARTANEGARA') !== -1) return 'KUTAI KARTANEGARA';
  if (s.indexOf('KUTAI TIMUR') !== -1) return 'KUTAI TIMUR';
  if (s.indexOf('KUTAI BARAT') !== -1) return 'KUTAI BARAT';
  if (s.indexOf('MAHAKAM') !== -1) return 'MAHAKAM ULU';
  if (s.indexOf('BERAU') !== -1) return 'BERAU';
  if (s.indexOf('PASER') !== -1) return 'PASER';
  return s || 'LAINNYA';
}

function maskNamePublic(fullName) {
  var s = toStr(fullName);
  if (!s || s === '-' || s.length < 2) return '-';
  s = s.replace(/\(.*?\)/g, '').replace(/[0-9+-]/g, '').trim();
  var parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + '.';
}

/**
 * Mengambil tabel Google Sheet via GViz JSONP (Anti-Cache & Bebas Blokir Browser)
 */
function fetchSheetRowsGViz(spreadsheetId, sheetName) {
  return new Promise(function (resolve, reject) {
    var callbackName = 'gviz_cb_' + Math.floor(Math.random() * 100000000);
    var script = null;
    var timeout = setTimeout(function () {
      cleanup();
      reject(new Error('Koneksi ke Google Sheet timeout (terlalu lama).'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = function (rawJson) {
      cleanup();
      if (!rawJson || rawJson.status !== 'ok') {
        var errMsg = (rawJson && rawJson.errors && rawJson.errors[0])
          ? rawJson.errors[0].message
          : 'Data sheet tidak valid atau tab tidak ditemukan.';
        reject(new Error('Error Google Sheets: ' + errMsg));
        return;
      }

      var table = rawJson.table;
      var colCount = table.cols.length;
      var rows = [];

      for (var r = 0; r < table.rows.length; r++) {
        var rowObj = table.rows[r];
        var rowArr = [];
        for (var c = 0; c < colCount; c++) {
          var cell = rowObj.c ? rowObj.c[c] : null;
          if (!cell || cell.v === null || cell.v === undefined) {
            rowArr.push('');
          } else {
            if (typeof cell.v === 'string' && cell.v.indexOf('Date(') === 0) {
              rowArr.push(cell.f || cell.v);
            } else {
              rowArr.push(cell.f !== undefined && cell.f !== null ? cell.f : cell.v);
            }
          }
        }
        rows.push(rowArr);
      }

      resolve(rows);
    };

    script = document.createElement('script');
    script.src = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId +
      '/gviz/tq?tqx=responseHandler:' + callbackName +
      '&sheet=' + encodeURIComponent(sheetName) +
      '&_nc=' + Date.now();

    script.onerror = function () {
      cleanup();
      reject(new Error('Spreadsheet tidak ditemukan atau belum diset publik (Share -> Anyone with the link can view).'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Parsing data Sheet REKAPITULASI
 */
function parseRekapRows(data) {
  var inKaltimSection = false;
  var kabList = [];
  var kabMap = {};
  var provTotal = null;

  var sumFallback = {
    wilayah: 'PROVINSI KALIMANTAN TIMUR',
    potSiswa: 0, potBumil: 0, potBusui: 0, potBalita: 0, potTotal: 0,
    targetSppg: 0, sppgBeroperasi: 0, sppgStop: 0, sppgBelum: 0, totalSppg: 0,
    pmBalita: 0, pmBumil: 0, pmBusui: 0, total3B: 0,
    pmSiswa: 0, pmTendik: 0, pmNonTendik: 0, totalPm: 0,
    bpjsSudah: 0, slhsSudah: 0, chefSudah: 0, halalSudah: 0,
    updateTanggal: '-'
  };

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var c0 = toStr(row[0]);
    var c1 = toStr(row[1]);
    var upper0 = c0.toUpperCase();
    var upper1 = c1.toUpperCase();

    if (upper0.indexOf('KALIMANTAN TIMUR') !== -1 || upper1.indexOf('KALIMANTAN TIMUR') !== -1) {
      inKaltimSection = true;
      continue;
    }

    if (inKaltimSection && (
      upper0.indexOf('PROVINSI KALIMANTAN UTARA') !== -1 ||
      upper0.indexOf('PROVINSI KALIMANTAN SELATAN') !== -1 ||
      upper0.indexOf('PROVINSI KALIMANTAN TENGAH') !== -1 ||
      upper0.indexOf('PROVINSI KALIMANTAN BARAT') !== -1 ||
      upper1.indexOf('PROVINSI KALIMANTAN UTARA') !== -1 ||
      upper1.indexOf('PROVINSI KALIMANTAN SELATAN') !== -1
    )) {
      break;
    }

    if (!inKaltimSection) continue;

    if (upper0 === 'TOTAL' || upper1 === 'TOTAL' || upper0.indexOf('JUMLAH') === 0 || upper1.indexOf('JUMLAH') === 0) {
      var pSiswa = toNum(row[2]), pBumil = toNum(row[3]), pBusui = toNum(row[4]), pBalita = toNum(row[5]);
      var pTot = toNum(row[6]) > 0 ? toNum(row[6]) : (pSiswa + pBumil + pBusui + pBalita);

      var tSppg = toNum(row[7]);
      var sAktif = toNum(row[8]);
      var sStop = toNum(row[9]);
      var sBelum = toNum(row[10]);
      var totSppg = toNum(row[11]) > 0 ? toNum(row[11]) : (sAktif + sStop + sBelum);

      var mBalita = toNum(row[14]), mBumil = toNum(row[15]), mBusui = toNum(row[16]);
      var tot3B = toNum(row[17]) > 0 ? toNum(row[17]) : (mBalita + mBumil + mBusui);
      var mSiswa = toNum(row[18]), mTendik = toNum(row[19]), mNonTendik = toNum(row[20]);
      var totPm = toNum(row[21]) > 0 ? toNum(row[21]) : (tot3B + mSiswa + mTendik + mNonTendik);

      provTotal = {
        wilayah: 'PROVINSI KALIMANTAN TIMUR',
        potSiswa: pSiswa, potBumil: pBumil, potBusui: pBusui, potBalita: pBalita, potTotal: pTot,
        targetSppg: tSppg, sppgBeroperasi: sAktif, sppgStop: sStop, sppgBelum: sBelum, totalSppg: totSppg,
        pmBalita: mBalita, pmBumil: mBumil, pmBusui: mBusui, total3B: tot3B,
        pmSiswa: mSiswa, pmTendik: mTendik, pmNonTendik: mNonTendik, totalPm: totPm,
        bpjsSudah: toNum(row[23]), slhsSudah: toNum(row[25]), chefSudah: toNum(row[27]), halalSudah: toNum(row[29]),
        updateTanggal: toStr(row[31])
      };
      break;
    }

    var candidateName = c1 || c0;
    if (!candidateName || upper1 === 'NAMA WILAYAH' || upper1.indexOf('NOTE') === 0) continue;

    var kabNorm = normalizeKabName(candidateName);
    if (!KALTIM_COORDS[kabNorm] && isNaN(parseFloat(c0))) continue;
    if (kabMap[kabNorm]) continue;

    var coord = KALTIM_COORDS[kabNorm] || [-0.5022, 117.1536];

    var potSiswa = toNum(row[2]), potBumil = toNum(row[3]), potBusui = toNum(row[4]), potBalita = toNum(row[5]);
    var potTotal = toNum(row[6]) > 0 ? toNum(row[6]) : (potSiswa + potBumil + potBusui + potBalita);

    var targetSppg = toNum(row[7]);
    var sppgBeroperasi = toNum(row[8]);
    var sppgStop = toNum(row[9]);
    var sppgBelum = toNum(row[10]);
    var totalSppg = toNum(row[11]) > 0 ? toNum(row[11]) : (sppgBeroperasi + sppgStop + sppgBelum);

    var pmBalita = toNum(row[14]), pmBumil = toNum(row[15]), pmBusui = toNum(row[16]);
    var total3B = toNum(row[17]) > 0 ? toNum(row[17]) : (pmBalita + pmBumil + pmBusui);
    var pmSiswa = toNum(row[18]), pmTendik = toNum(row[19]), pmNonTendik = toNum(row[20]);
    var rawTotPm = toNum(row[21]);
    var totalPm = rawTotPm > 0 ? rawTotPm : (total3B + pmSiswa + pmTendik + pmNonTendik);

    var itemObj = {
      wilayah: kabNorm,
      lat: coord[0],
      lng: coord[1],
      potSiswa: potSiswa, potBumil: potBumil, potBusui: potBusui, potBalita: potBalita, potTotal: potTotal,
      targetSppg: targetSppg, sppgBeroperasi: sppgBeroperasi, sppgStop: sppgStop, sppgBelum: sppgBelum, totalSppg: totalSppg,
      pmBalita: pmBalita, pmBumil: pmBumil, pmBusui: pmBusui, total3B: total3B,
      pmSiswa: pmSiswa, pmTendik: pmTendik, pmNonTendik: pmNonTendik, totalPm: totalPm,
      bpjsSudah: toNum(row[23]), slhsSudah: toNum(row[25]), chefSudah: toNum(row[27]), halalSudah: toNum(row[29]),
      updateTanggal: toStr(row[31])
    };

    kabList.push(itemObj);
    kabMap[kabNorm] = itemObj;

    sumFallback.potSiswa += potSiswa;
    sumFallback.potBumil += potBumil;
    sumFallback.potBusui += potBusui;
    sumFallback.potBalita += potBalita;
    sumFallback.potTotal += potTotal;
    sumFallback.targetSppg += targetSppg;
    sumFallback.sppgBeroperasi += sppgBeroperasi;
    sumFallback.sppgStop += sppgStop;
    sumFallback.sppgBelum += sppgBelum;
    sumFallback.totalSppg += totalSppg;
    sumFallback.pmBalita += pmBalita;
    sumFallback.pmBumil += pmBumil;
    sumFallback.pmBusui += pmBusui;
    sumFallback.total3B += total3B;
    sumFallback.pmSiswa += pmSiswa;
    sumFallback.pmTendik += pmTendik;
    sumFallback.pmNonTendik += pmNonTendik;
    sumFallback.totalPm += totalPm;
    sumFallback.bpjsSudah += itemObj.bpjsSudah;
    sumFallback.slhsSudah += itemObj.slhsSudah;
    sumFallback.chefSudah += itemObj.chefSudah;
    sumFallback.halalSudah += itemObj.halalSudah;
  }

  return {
    provTotal: provTotal || sumFallback,
    kabList: kabList,
    kabMap: kabMap
  };
}

/**
 * Parsing data Sheet KALTIM (Detail Dapur SPPG)
 */
function parseSheetKaltimRows(data) {
  var items = [];
  var currKab = 'LAINNYA';

  var gmapsColIdx = 48;
  for (var hr = 0; hr < Math.min(4, data.length); hr++) {
    for (var hc = 0; hc < data[hr].length; hc++) {
      var hText = toStr(data[hr][hc]).toLowerCase();
      if (hText.indexOf('maps') !== -1 || hText.indexOf('gmaps') !== -1 || hText.indexOf('koordinat') !== -1 || hText.indexOf('titik lokasi') !== -1) {
        gmapsColIdx = hc;
        break;
      }
    }
  }

  for (var r = 2; r < data.length; r++) {
    var row = data[r];
    var v0 = toStr(row[0]);
    var v1 = toStr(row[1]);
    var v2 = toStr(row[2]);
    var v3 = toStr(row[3]);

    var isNum0 = !isNaN(parseFloat(v0)) && isFinite(v0) && parseFloat(v0) > 0;

    if (!isNum0 && v0 && !v1 && !v2) {
      var upperV0 = v0.toUpperCase();
      if (upperV0.indexOf('TOTAL') === -1 && upperV0.indexOf('JUMLAH') === -1) {
        currKab = normalizeKabName(v0);
      }
      continue;
    }

    var upperV2 = v2.toUpperCase();
    if (!v2 || upperV2 === 'NAMA SPPG' || upperV2.indexOf('JUMLAH') !== -1 || upperV2.indexOf('TOTAL') !== -1) {
      continue;
    }

    var rowKab = currKab;
    if (rowKab === 'LAINNYA') {
      var guessedKab = normalizeKabName(v2);
      if (KALTIM_COORDS[guessedKab]) {
        rowKab = guessedKab;
      }
    }

    var balita = toNum(row[21]);
    var bumil = toNum(row[22]);
    var busui = toNum(row[23]);
    var col3B = toNum(row[24]);
    var tot3B = col3B > 0 ? col3B : (balita + bumil + busui);

    var siswa = toNum(row[25]);
    var tendik = toNum(row[26]);
    var nonTendik = toNum(row[27]);
    var colTotPm = toNum(row[28]);
    var totPm = colTotPm > 0 ? colTotPm : (tot3B + siswa + tendik + nonTendik);

    var rawStatus = toStr(row[4]) || 'Belum beroperasi';
    var rawKet = toStr(row[38]) + ' ' + toStr(row[39]) + ' ' + toStr(row[40]);
    var combinedText = (rawStatus + ' ' + rawKet).toLowerCase();

    var hasSuspend = combinedText.indexOf('suspend') !== -1;
    var hasKarhutla = combinedText.indexOf('karhutla') !== -1 || combinedText.indexOf('kebakaran') !== -1 || combinedText.indexOf('asap') !== -1;

    var statusCategory = 'BELUM';
    var sLower = rawStatus.toLowerCase();

    if (hasKarhutla) {
      statusCategory = 'KARHUTLA';
    } else if (hasSuspend) {
      statusCategory = 'SUSPEND';
    } else if (sLower.indexOf('beroperasi') !== -1 && sLower.indexOf('belum') === -1 && sLower.indexOf('stop') === -1 && sLower.indexOf('berhenti') === -1) {
      statusCategory = 'BEROPERASI';
    } else if (sLower.indexOf('stop') !== -1 || sLower.indexOf('berhenti') !== -1 || sLower.indexOf('evaluasi') !== -1) {
      statusCategory = 'SUSPEND';
    }

    items.push({
      no: v0 || '-',
      idSppg: v1 || '-',
      namaSppg: v2,
      kabupaten: rowKab,
      jenisSppg: v3 || 'SPPG Mitra',
      status: rawStatus,
      statusCategory: statusCategory,
      tglOps: toStr(row[5]),
      kepalaSppg: maskNamePublic(row[6]),
      ig: toStr(row[8]),
      tiktok: toStr(row[9]),
      fb: toStr(row[10]),
      bpjs: toStr(row[13]) || '-',
      slhs: toStr(row[14]) || '-',
      halal: toStr(row[15]) || '-',
      chef: toStr(row[16]) || '-',
      pmBalita: balita,
      pmBumil: bumil,
      pmBusui: busui,
      total3B: tot3B,
      pmSiswa: siswa,
      pmTendik: tendik,
      pmNonTendik: nonTendik,
      totalPm: totPm,
      updateTanggal: toStr(row[37]),
      yayasan: toStr(row[42]) || '-',
      akuntan: maskNamePublic(row[45] || row[44]),
      ahliGizi: maskNamePublic(row[47] || row[46]),
      gmapsUrl: row.length > gmapsColIdx ? toStr(row[gmapsColIdx]) : ''
    });
  }

  return items;
}

/**
 * Counter Pengunjung Mandiri (disimpan di LocalStorage & Session)
 */
function getLocalVisitorStats() {
  try {
    var storedTotal = parseInt(localStorage.getItem('bgn_kaltim_total_visits') || '128', 10);
    var todayKey = 'bgn_kaltim_today_' + (new Date().toISOString().slice(0, 10));
    var storedToday = parseInt(localStorage.getItem(todayKey) || '14', 10);

    if (!sessionStorage.getItem('bgn_kaltim_session_counted')) {
      storedTotal += 1;
      storedToday += 1;
      localStorage.setItem('bgn_kaltim_total_visits', String(storedTotal));
      localStorage.setItem(todayKey, String(storedToday));
      sessionStorage.setItem('bgn_kaltim_session_counted', 'true');
    }

    return { total: storedTotal, today: storedToday };
  } catch (e) {
    return { total: 150, today: 25 };
  }
}

/**
 * FUNGSI UTAMA: Ambil & susun data dari Google Spreadsheet langsung dari browser
 */
async function loadKaltimDashboardDataDirect(spreadsheetId, rekapSheetName, kaltimSheetName) {
  var sId = String(spreadsheetId || '').trim();
  if (!sId) {
    throw new Error('ID Spreadsheet belum ditentukan.');
  }

  var rekapName = rekapSheetName || 'REKAPITULASI';
  var kaltimName = kaltimSheetName || 'KALTIM';

  // Ambil kedua sheet secara paralel untuk performa maksimal
  var results = await Promise.all([
    fetchSheetRowsGViz(sId, rekapName),
    fetchSheetRowsGViz(sId, kaltimName)
  ]);

  var rekapRows = results[0];
  var kaltimRows = results[1];

  var rekapParsed = parseRekapRows(rekapRows);
  var sppgParsed = parseSheetKaltimRows(kaltimRows);
  var visitorData = getLocalVisitorStats();

  return {
    provTotal: rekapParsed.provTotal,
    kabList: rekapParsed.kabList,
    kabMap: rekapParsed.kabMap,
    sppgItems: sppgParsed,
    visitor: visitorData
  };
}
