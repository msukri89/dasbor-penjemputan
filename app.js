const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";
let dataMaster = null; let grafikUtama = null;

let dataBelumDasborGlobal = []; 
let dataBelumMandiriLokal = [];
let limitTampil = 50;

let sesiRole = ""; let sesiNama = "";

const areaDasbor = document.getElementById('areaDasbor'); 
const areaRekap = document.getElementById('areaRekap');
const areaBelum = document.getElementById('areaBelum');
const areaFilterGlobal = document.getElementById('areaFilterGlobal');

const menuDasbor = document.getElementById('menuDasbor');
const menuRekap = document.getElementById('menuRekap');
const menuBelum = document.getElementById('menuBelum');

const filterPetugas = document.getElementById('filterPetugas');
const filterPekan = document.getElementById('filterPekan');
const filterBelumPetugas = document.getElementById('filterBelumPetugas');
const filterBelumPekan = document.getElementById('filterBelumPekan');
const filterJenisDonatur = document.getElementById('filterJenisDonatur');
const inputCariDonatur = document.getElementById('inputCariDonatur');

// ==========================================
// LOGIKA MENU NAVIGASI (LAZY LOADING)
// ==========================================
function tutupSidebar() { document.getElementById('sidebar').classList.remove('terbuka'); document.getElementById('overlay').classList.remove('terbuka'); }
document.getElementById('openSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.add('terbuka'); document.getElementById('overlay').classList.add('terbuka'); });
document.getElementById('closeSidebar').addEventListener('click', tutupSidebar);
document.getElementById('overlay').addEventListener('click', tutupSidebar);

menuDasbor.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'block'; areaRekap.style.display = 'none'; areaBelum.style.display = 'none';
    areaFilterGlobal.style.display = 'flex'; if(sesiRole === "ADMIN") filterPetugas.style.display = 'block'; 
    menuDasbor.classList.add('aktif'); menuRekap.classList.remove('aktif'); menuBelum.classList.remove('aktif');
    tutupSidebar();
});

menuRekap.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; areaRekap.style.display = 'block'; areaBelum.style.display = 'none';
    areaFilterGlobal.style.display = 'flex'; 
    if(sesiRole === "ADMIN") { filterPetugas.style.display = 'block'; } else { filterPetugas.style.display = 'none'; }
    menuRekap.classList.add('aktif'); menuDasbor.classList.remove('aktif'); menuBelum.classList.remove('aktif');
    tutupSidebar();
    
    document.getElementById('wadahRekap').innerHTML = `<div class="kartu-rekap"><div class="rekap-header"><span class="skeleton skeleton-text"></span></div><div class="rekap-body"><span class="skeleton" style="width:100%; height:100px;"></span></div></div>`.repeat(3);
    setTimeout(() => { tampilkanRekap(); }, 50);
});

menuBelum.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; areaRekap.style.display = 'none'; areaBelum.style.display = 'block';
    areaFilterGlobal.style.display = 'none'; 
    menuBelum.classList.add('aktif'); menuDasbor.classList.remove('aktif'); menuRekap.classList.remove('aktif');
    tutupSidebar(); 
    
    inputCariDonatur.value = ""; // Bersihkan kolom pencarian saat pindah menu
    
    document.getElementById('wadahDaftarBelum').innerHTML = `<div class="kartu-belum"><div style="width:100%;"><span class="skeleton" style="width:80%; height:14px; margin-bottom:6px; display:block;"></span><span class="skeleton" style="width:50%; height:10px; display:block;"></span></div><div class="skeleton" style="width:35px; height:35px; border-radius:50%; flex-shrink:0;"></div></div>`.repeat(5);
    document.getElementById('wadahTombolMuat').innerHTML = "";
    setTimeout(() => { hitungDaftarBelumMandiri(false); }, 50);
});

document.getElementById('menuLogout').addEventListener('click', (e) => {
    e.preventDefault(); localStorage.removeItem('laz_id'); localStorage.removeItem('laz_pin'); window.location.reload(); 
});

function hilangkanSkeleton() { document.querySelectorAll('.skeleton-mode').forEach(el => { el.classList.remove('skeleton-mode'); }); }

// ==========================================
// LOGIKA LOGIN & INITIALISASI PUSAT
// ==========================================
document.getElementById('btnMasuk').addEventListener('click', () => {
    const id = document.getElementById('inputId').value; const pin = document.getElementById('inputPin').value;
    if(id==="" || pin==="") { document.getElementById('pesanError').innerText = "Mohon isi ID dan PIN!"; return; }
    eksekusiMasuk(id, pin, true);
});

async function eksekusiMasuk(idInput, pinInput, isManual) {
    if(isManual) { document.getElementById('btnMasuk').innerText = "Memeriksa Data..."; document.getElementById('pesanError').innerText = "";
    } else { document.getElementById('layarLogin').style.display = 'none'; } 

    try {
        const fetchUrl = SCRIPT_URL + `?id=${encodeURIComponent(idInput)}&pin=${encodeURIComponent(pinInput)}`;
        const res = await fetch(fetchUrl); const json = await res.json();
        
        if(json.status === "ERROR") {
            if(isManual) { document.getElementById('pesanError').innerText = json.pesan; document.getElementById('btnMasuk').innerText = "MASUK";
            } else { localStorage.removeItem('laz_id'); localStorage.removeItem('laz_pin'); document.getElementById('layarLogin').style.display = 'flex'; }
            return;
        }

        dataMaster = json.data; sesiRole = json.role; sesiNama = json.nama;
        localStorage.setItem('laz_id', idInput); localStorage.setItem('laz_pin', pinInput);
        
        document.getElementById('layarLogin').style.display = 'none'; document.getElementById('namaPenggunaAktif').innerText = sesiNama;

        if(sesiRole !== "ADMIN") {
            document.getElementById('filterPetugas').style.display = 'none'; 
            document.getElementById('wadahFilterBelumPetugas').style.display = 'flex'; 
            document.getElementById('filterBelumPetugas').style.display = 'none'; 
        } else {
            document.getElementById('filterPetugas').style.display = 'block'; 
            document.getElementById('wadahFilterBelumPetugas').style.display = 'flex';
            document.getElementById('filterBelumPetugas').style.display = 'block';
        }

        isiOpsiPetugas(); 
        kalkulasiGlobalDasbor(); 

    } catch (e) { 
        if(isManual){ document.getElementById('pesanError').innerText = "Gagal terhubung ke jaringan."; document.getElementById('btnMasuk').innerText = "MASUK"; }
        document.getElementById('teksPersentase').innerText = "ERR"; 
    }
}

function isiOpsiPetugas() {
    let s = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    
    let htmlGlobal = sesiRole === "ADMIN" ? '<option value="Semua">SEMUA PETUGAS</option>' : '';
    let htmlLokal = sesiRole === "ADMIN" ? '<option value="Semua">SEMUA PETUGAS</option>' : '';
    
    Array.from(s).sort().forEach(n => { if(n && n!=="undefined") { htmlGlobal += `<option value="${n}">${n}</option>`; htmlLokal += `<option value="${n}">${n}</option>`; } });
    filterPetugas.innerHTML = htmlGlobal; filterBelumPetugas.innerHTML = htmlLokal;
    if(sesiRole !== "ADMIN") { filterPetugas.value = sesiNama; filterBelumPetugas.value = sesiNama; }
}

function getPekan(t) {
    if(!t) return "0"; let s=String(t), h=0;
    if(s.includes('/')) h=parseInt(s.split('/')[0],10); else if(s.includes('-')) h=parseInt(s.split('T')[0].split('-')[2],10); else h=new Date(s).getDate();
    return h<=7?"1":h<=14?"2":h<=21?"3":h<=31?"4":"0";
}

// ==========================================
// FUNGSI 1: DASBOR UTAMA
// ==========================================
function kalkulasiGlobalDasbor() {
    if(!dataMaster) return;
    const fPet = sesiRole === "ADMIN" ? filterPetugas.value : sesiNama;
    const fPekRaw = filterPekan.value; const fPek = fPekRaw === "Total Bulan Ini" ? "Total" : fPekRaw.replace("Pekan ","");
    
    dataBelumDasborGlobal = []; let totalRp = 0, bIns = 0;

    let idR_Global = new Set(), idIKP_Global = new Set(), idIIP_Global = new Set();
    dataMaster.terima_orang.filter(b => (fPet==="Semua" || b["Nama User"]===fPet)).forEach(b => { if(String(b.Spesifikasi||"").toUpperCase().includes("RUTIN")) idR_Global.add(String(b["Kode Donatur"]).trim()); });
    dataMaster.terima_kotak.filter(b => (fPet==="Semua" || b["Nama User"]===fPet)).forEach(b => {
        let sp = String(b.Spesifikasi||"").toUpperCase(); if(sp.includes("IKP")) idIKP_Global.add(String(b["Kode Donatur"]).trim()); if(sp.includes("IIP")) idIIP_Global.add(String(b["Kode Donatur"]).trim());
    });

    let bR_Pekan = 0, bK1_Pekan = 0, bK2_Pekan = 0;
    
    dataMaster.terima_orang.filter(b => (fPet==="Semua" || b["Nama User"]===fPet) && (fPek==="Total" || getPekan(b.Tanggal)===fPek)).forEach(b => { 
        totalRp += Number(b.Nominal||0); let sp = String(b.Spesifikasi||"").toUpperCase(); if(sp.includes("RUTIN")) bR_Pekan++; else if(sp.includes("INSIDEN")) bIns++; 
    });
    
    dataMaster.terima_kotak.filter(b => (fPet==="Semua" || b["Nama User"]===fPet) && (fPek==="Total" || getPekan(b.Tanggal)===fPek)).forEach(b => { 
        totalRp += Number(b.Nominal||0); let sp = String(b.Spesifikasi||"").toUpperCase(); if(sp.includes("IKP")) bK1_Pekan++; if(sp.includes("IIP")) bK2_Pekan++; 
    });

    let mR = dataMaster.master_orang.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let mK = dataMaster.master_kotak.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let kR = mR.length, kK1 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length, kK2 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length;

    let sisaRutin = 0, sisaIKP = 0, sisaIIP = 0;
    mR.forEach(b => { if(!idR_Global.has(String(b["Nomor Register"]).trim())) { dataBelumDasborGlobal.push({n:b["Nama Donatur"], k:"RUTIN", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaRutin++; } });
    mK.forEach(b => {
        let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
        if(sp.includes("IKP") && !idIKP_Global.has(id)) { dataBelumDasborGlobal.push({n:b["Nama Donatur"], k:"IKP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaIKP++; } 
        else if(sp.includes("IIP") && !idIIP_Global.has(id)) { dataBelumDasborGlobal.push({n:b["Nama Donatur"], k:"IIP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaIIP++; }
    });

    let dBaruRutin = 0, dBaruIKP = 0, dBaruIIP = 0;
    if(dataMaster.baru_orang) { dataMaster.baru_orang.forEach(b => { let pet = String(b.Kolektor || b["Nama User"] || "").trim(); let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal); if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) { if(String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase().includes("RUTIN")) dBaruRutin++; } }); }
    if(dataMaster.baru_kotak) { dataMaster.baru_kotak.forEach(b => { let pet = String(b.Kolektor || b["Nama User"] || "").trim(); let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal); if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) { let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase(); if(sp.includes("IKP")) dBaruIKP++; if(sp.includes("IIP")) dBaruIIP++; } }); }

    let totalKewajiban = kR + kK1 + kK2, totalSisa = sisaRutin + sisaIKP + sisaIIP;
    
    document.getElementById('teksPersentase').innerText = totalKewajiban > 0 ? Math.round(((totalKewajiban - totalSisa) / totalKewajiban) * 100) + "%" : "0%";
    document.getElementById('teksBerhasil').innerText = bR_Pekan + bK1_Pekan + bK2_Pekan + bIns;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalRp.toLocaleString('id-ID');
    
    document.getElementById('teksRutin').innerText = kR; document.getElementById('teksBaruRutin').innerText = "+" + dBaruRutin; document.getElementById('teksSisaRutin').innerText = "-" + sisaRutin;
    document.getElementById('teksIKP').innerText = kK1; document.getElementById('teksBaruIKP').innerText = "+" + dBaruIKP; document.getElementById('teksSisaIKP').innerText = "-" + sisaIKP;
    document.getElementById('teksIIP').innerText = kK2; document.getElementById('teksBaruIIP').innerText = "+" + dBaruIIP; document.getElementById('teksSisaIIP').innerText = "-" + sisaIIP;

    drawGrafik(bR_Pekan, bK1_Pekan, bK2_Pekan, bIns, sisaRutin, sisaIKP, sisaIIP); 
    hilangkanSkeleton();
}

// ==========================================
// FUNGSI 2: RAPOR PRIBADI & KLASEMEN
// ==========================================
function tampilkanRekap() {
    if(!dataMaster) return;
    const w = document.getElementById('wadahRekap'); w.innerHTML = "";
    const fPek = filterPekan.value === "Total Bulan Ini" ? "Total" : filterPekan.value.replace("Pekan ","");
    const fPet = sesiRole === "ADMIN" ? filterPetugas.value : sesiNama; 
    
    let petugasSet = new Set();
    dataMaster.master_orang.forEach(b => { let p = String(b.Kolektor).trim(); if(p && (fPet === "Semua" || p === fPet)) petugasSet.add(p); });
    dataMaster.master_kotak.forEach(b => { let p = String(b.Kolektor).trim(); if(p && (fPet === "Semua" || p === fPet)) petugasSet.add(p); });
    
    let daftarRekap = []; const fmt = (num) => num.toLocaleString('id-ID');
    
    const renderSisaBtn = (sisa, pet, kat) => {
        if (sisa === 0) return `<span style="color: #10B981; font-weight: bold;"><i class="fas fa-check"></i></span>`;
        if (sesiRole === "ADMIN") return `<div class="btn-sisa-rekap" onclick="downloadSisaRekap('${pet}', '${kat}')">${sisa} <i class="fas fa-download"></i></div>`;
        return `<span style="color: var(--merah-bata); font-weight: bold;">${sisa}</span>`;
    };

    petugasSet.forEach(petugas => {
        let kW = { r:0, k1:0, k2:0, tot:0 }, bD = { ins:0, r:0, k1:0, k2:0, tot:0 }, bR = { ins:0, r:0, k1:0, k2:0, tot:0 }, nO = { ins:0, r:0, k1:0, k2:0, tot:0 };
        let idR_Glob = new Set(), idIKP_Glob = new Set(), idIIP_Glob = new Set();
        
        dataMaster.terima_orang.filter(b => b["Nama User"]===petugas).forEach(b => { if(String(b.Spesifikasi||"").toUpperCase().includes("RUTIN")) idR_Glob.add(String(b["Kode Donatur"]).trim()); });
        dataMaster.terima_kotak.filter(b => b["Nama User"]===petugas).forEach(b => { let sp = String(b.Spesifikasi||"").toUpperCase(); if(sp.includes("IKP")) idIKP_Glob.add(String(b["Kode Donatur"]).trim()); if(sp.includes("IIP")) idIIP_Glob.add(String(b["Kode Donatur"]).trim()); });

        let mR = dataMaster.master_orang.filter(b => String(b.Kolektor).trim()===petugas && (fPek==="Total" || String(b.Pekan)===fPek));
        let mK = dataMaster.master_kotak.filter(b => String(b.Kolektor).trim()===petugas && (fPek==="Total" || String(b.Pekan)===fPek));
        kW.r = mR.length; kW.k1 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length; kW.k2 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length; kW.tot = kW.r + kW.k1 + kW.k2;

        dataMaster.terima_orang.filter(b => b["Nama User"]===petugas && (fPek==="Total" || getPekan(b.Tanggal)===fPek)).forEach(b => { let sp = String(b.Spesifikasi||"").toUpperCase(); let nom = Number(b.Nominal||0); if(sp.includes("RUTIN")) { bD.r++; nO.r += nom; } else if(sp.includes("INSIDEN")) { bD.ins++; nO.ins += nom; } });
        dataMaster.terima_kotak.filter(b => b["Nama User"]===petugas && (fPek==="Total" || getPekan(b.Tanggal)===fPek)).forEach(b => { let sp = String(b.Spesifikasi||"").toUpperCase(); let nom = Number(b.Nominal||0); if(sp.includes("IKP")) { bD.k1++; nO.k1 += nom; } if(sp.includes("IIP")) { bD.k2++; nO.k2 += nom; } });
        bD.tot = bD.r + bD.k1 + bD.k2 + bD.ins; nO.tot = nO.r + nO.k1 + nO.k2 + nO.ins;

        if(dataMaster.baru_orang) { dataMaster.baru_orang.filter(b => (String(b.Kolektor || b["Nama User"] || "").trim()===petugas) && (fPek==="Total" || (b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal))===fPek)).forEach(b => { if(String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase().includes("RUTIN")) bR.r++; else if(String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase().includes("INSIDEN")) bR.ins++; }); }
        if(dataMaster.baru_kotak) { dataMaster.baru_kotak.filter(b => (String(b.Kolektor || b["Nama User"] || "").trim()===petugas) && (fPek==="Total" || (b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal))===fPek)).forEach(b => { let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase(); if(sp.includes("IKP")) bR.k1++; if(sp.includes("IIP")) bR.k2++; }); }
        bR.tot = bR.r + bR.k1 + bR.k2 + bR.ins;

        let sisaR = 0, sisaK1 = 0, sisaK2 = 0;
        mR.forEach(b => { if(!idR_Glob.has(String(b["Nomor Register"]).trim())) sisaR++; });
        mK.forEach(b => { let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase(); if(sp.includes("IKP") && !idIKP_Glob.has(id)) sisaK1++; else if(sp.includes("IIP") && !idIIP_Glob.has(id)) sisaK2++; });
        
        let sisaTot = sisaR + sisaK1 + sisaK2; let persen = kW.tot > 0 ? Math.round(((kW.tot - sisaTot) / kW.tot) * 100) : 0;
        let pWarna = persen >= 80 ? 'var(--hijau-lime)' : (persen >= 50 ? '#EAB308' : '#EF4444');

        let cardHtml = `<div class="kartu-rekap"><div class="rekap-header"><h3>${petugas}</h3><div class="persentase" style="color: ${pWarna}">${persen}%</div></div><div class="rekap-body"><table class="tabel-rekap"><tr><th>KAT</th><th>TARGET</th><th>MASUK</th><th>BARU</th><th>SISA</th><th>NOMINAL</th></tr><tr><td>Insidental</td><td>-</td><td>${bD.ins}</td><td>${bR.ins}</td><td>-</td><td>Rp ${fmt(nO.ins)}</td></tr><tr><td>Rutin</td><td>${kW.r}</td><td>${bD.r}</td><td>${bR.r}</td><td>${renderSisaBtn(sisaR, petugas, 'RUTIN')}</td><td>Rp ${fmt(nO.r)}</td></tr><tr><td>IKP</td><td>${kW.k1}</td><td>${bD.k1}</td><td>${bR.k1}</td><td>${renderSisaBtn(sisaK1, petugas, 'IKP')}</td><td>Rp ${fmt(nO.k1)}</td></tr><tr><td>IIP</td><td>${kW.k2}</td><td>${bD.k2}</td><td>${bR.k2}</td><td>${renderSisaBtn(sisaK2, petugas, 'IIP')}</td><td>Rp ${fmt(nO.k2)}</td></tr><tr class="jumlah"><td>JUMLAH</td><td>${kW.tot}</td><td>${bD.tot}</td><td>${bR.tot}</td><td>${sisaTot}</td><td>Rp ${fmt(nO.tot)}</td></tr></table></div></div>`;
        daftarRekap.push({ persen: persen, html: cardHtml });
    });

    daftarRekap.sort((a, b) => b.persen - a.persen);
    let finalHtml = ""; daftarRekap.forEach(item => { finalHtml += item.html; });
    w.innerHTML = finalHtml;
}

// ==========================================
// FUNGSI 3: DAFTAR BELUM BERDONASI (MODIFIKASI LUNAS/BELUM)
// ==========================================
function hitungDaftarBelumMandiri(muatLebih = false) {
    if(!dataMaster) return;
    if(!muatLebih) limitTampil = 50; 

    const fPet = sesiRole === "ADMIN" ? filterBelumPetugas.value : sesiNama;
    const fPekRaw = filterBelumPekan.value;
    const fPek = fPekRaw === "Total Bulan Ini" ? "Total" : fPekRaw.replace("Pekan ","");
    const fKat = filterJenisDonatur.value;

    dataBelumMandiriLokal = [];

    let idR_Lokal = new Set(), idIKP_Lokal = new Set(), idIIP_Lokal = new Set();
    dataMaster.terima_orang.filter(b => (fPet==="Semua" || b["Nama User"]===fPet)).forEach(b => { if(String(b.Spesifikasi||"").toUpperCase().includes("RUTIN")) idR_Lokal.add(String(b["Kode Donatur"]).trim()); });
    dataMaster.terima_kotak.filter(b => (fPet==="Semua" || b["Nama User"]===fPet)).forEach(b => {
        let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("IKP")) idIKP_Lokal.add(String(b["Kode Donatur"]).trim()); if(sp.includes("IIP")) idIIP_Lokal.add(String(b["Kode Donatur"]).trim());
    });

    let mR = dataMaster.master_orang.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let mK = dataMaster.master_kotak.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));

    // MASUKKAN SEMUA DATA & BERI PENANDA (isLunas)
    mR.forEach(b => { 
        let id = String(b["Nomor Register"]).trim();
        let statusLunas = idR_Lokal.has(id);
        dataBelumMandiriLokal.push({n:b["Nama Donatur"], k:"RUTIN", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim(), r:id, pek:String(b.Pekan).trim(), isLunas: statusLunas}); 
    });
    
    mK.forEach(b => {
        let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
        if(sp.includes("IKP")) { 
            let statusLunas = idIKP_Lokal.has(id);
            dataBelumMandiriLokal.push({n:b["Nama Donatur"], k:"IKP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim(), r:id, pek:String(b.Pekan).trim(), isLunas: statusLunas}); 
        } 
        else if(sp.includes("IIP")) { 
            let statusLunas = idIIP_Lokal.has(id);
            dataBelumMandiriLokal.push({n:b["Nama Donatur"], k:"IIP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim(), r:id, pek:String(b.Pekan).trim(), isLunas: statusLunas}); 
        }
    });

    let dataAkhirTerfilter = (fKat === "Semua") ? dataBelumMandiriLokal : dataBelumMandiriLokal.filter(d => d.k === fKat);
    
    const kataKunci = inputCariDonatur.value.toLowerCase().trim();
    if (kataKunci !== "") {
        dataAkhirTerfilter = dataAkhirTerfilter.filter(d => 
            String(d.n).toLowerCase().includes(kataKunci) || 
            String(d.r).toLowerCase().includes(kataKunci)
        );
    }

    // Hitung Sisa Aktual (Yang belum lunas)
    let sisaAktual = dataAkhirTerfilter.filter(d => !d.isLunas).length;
    document.getElementById('totalSisaBelum').innerText = sisaAktual;
    
    // Urutkan: Yang belum lunas di atas, yang sudah lunas di bawah
    dataAkhirTerfilter.sort((a, b) => (a.isLunas === b.isLunas) ? 0 : a.isLunas ? 1 : -1);

    renderDaftarKeLayar(dataAkhirTerfilter);
}

function renderDaftarKeLayar(dataList) {
    const wadah = document.getElementById('wadahDaftarBelum');
    const wadahTombol = document.getElementById('wadahTombolMuat');
    
    if(dataList.length === 0) {
        wadah.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--teks-pudar); font-weight:600;">Tidak ada data yang ditemukan.</div>`;
        wadahTombol.innerHTML = ""; return;
    }

    let teksBufferHTML = "";
    let dataPorsiTampil = dataList.slice(0, limitTampil);

    dataPorsiTampil.forEach((d, urutan) => {
        let n = String(d.h || "").replace(/[^0-9]/g,''); if(n.startsWith('0')) n = '62' + n.substring(1);
        let p = `Assalamu'alaikum, Bapak/Ibu *${d.n}*. \n\nBagaimana kabarnya? Semoga senantiasa sehat dan penuh berkah bersama keluarga.\n\nAlhamdulillah, donasi Bapak/Ibu bulan lalu telah tersalurkan dengan baik. Terima kasih banyak atas istiqomahnya dalam kebaikan.\n\nUntuk bulan ini, saya *${d.p}* kembali siap melayani penjemputan donasi jika Bapak/Ibu sudah berkenan. Longgar hari apa dan jam berapa kira-kira, Pak/Bu?\nNanti kami sesuaikan jadwal berkunjungnya.`;
        let l = n ? `https://wa.me/${n}?text=${encodeURIComponent(p)}` : '#';
        
        let namaBersih = d.n.replace(/'/g, "\\'"); 
        let labelPekan = (d.pek && d.pek !== "0" && d.pek !== "undefined" && d.pek !== "") ? `Pekan ${d.pek}` : "Pekan -";
        
        // Logika Visual "Clear White" Lunas vs Belum
        let warnaGaris = d.isLunas ? 'var(--garis-halus)' : (d.k === 'RUTIN' ? 'var(--aksen-utama)' : (d.k === 'IKP' ? '#0EA5E9' : '#8B5CF6'));
        let warnaBadge = d.isLunas ? 'var(--garis-halus)' : warnaGaris;
        let teksBadge = d.isLunas ? 'var(--teks-pudar)' : '#FFFFFF';
        let warnaTeksPekan = d.isLunas ? '#9CA3AF' : '#6B7280';
        let opacityKartu = d.isLunas ? '0.6' : '1';
        let bgKartu = d.isLunas ? '#F9FAFB' : 'var(--bg-kartu)';

        let aksiTombolWa = d.isLunas 
            ? `<span style="background: var(--garis-halus); color: var(--teks-pudar); padding: 8px 12px; border-radius: 10px; font-size: 11px; font-weight: 700;"><i class="fas fa-check-circle"></i> Selesai</span>`
            : `<a href="${l}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a>`;

        teksBufferHTML += `
            <div class="kartu-belum" style="border-left: 4px solid ${warnaGaris}; background-color: ${bgKartu}; opacity: ${opacityKartu};">
                <div class="info-donatur">
                    <h4>
                        <span class="nomor-urut" style="color:${d.isLunas ? '#D1D5DB' : '#9CA3AF'}">#${urutan + 1}</span> 
                        <span style="color:${d.isLunas ? '#9CA3AF' : 'var(--teks-gelap)'}">${d.n}</span> 
                        <span class="badge" style="background:${warnaBadge}; color:${teksBadge};">${d.k}</span>
                        <span class="badge" style="background:${d.isLunas ? '#F3F4F6' : '#F3F4F6'}; color:${warnaTeksPekan}; margin-left:3px;">${labelPekan}</span>
                    </h4>
                    <p style="color:${d.isLunas ? '#D1D5DB' : 'var(--teks-pudar)'}">${d.a}</p>
                </div>
                <div class="grup-tombol">
                    <button class="btn-edit" style="background: ${d.isLunas ? '#F3F4F6' : 'var(--bg-utama)'}; color: ${d.isLunas ? '#9CA3AF' : 'var(--teks-gelap)'};" onclick="bukaModalEdit('${namaBersih}', '${d.r}', '${d.pek}')"><i class="fas fa-calendar-alt"></i></button>
                    ${aksiTombolWa}
                </div>
            </div>`;
    });

    wadah.innerHTML = teksBufferHTML;
    if(dataList.length > limitTampil) { wadahTombol.innerHTML = `<button class="btn-muat-banyak" onclick="aksiMuatLebihBanyak()">Muat Lebih Banyak... (${dataList.length - limitTampil} Sisa)</button>`; } 
    else { wadahTombol.innerHTML = ""; }
}


