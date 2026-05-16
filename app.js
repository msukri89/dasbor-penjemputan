const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";
let dataMaster = null; let grafikUtama = null; let dataBelumBerdonasi = [];

const sidebar = document.getElementById('sidebar'); 
const overlay = document.getElementById('overlay');

// Area Halaman
const areaDasbor = document.getElementById('areaDasbor'); 
const areaRekap = document.getElementById('areaRekap');
const areaBelum = document.getElementById('areaBelum');

// Menu Navigasi
const menuDasbor = document.getElementById('menuDasbor');
const menuRekap = document.getElementById('menuRekap');
const menuBelum = document.getElementById('menuBelum');

// Dropdown Petugas
const filterPetugas = document.getElementById('filterPetugas');

function tutupSidebar() { sidebar.classList.remove('terbuka'); overlay.classList.remove('terbuka'); }
document.getElementById('openSidebar').addEventListener('click', () => { sidebar.classList.add('terbuka'); overlay.classList.add('terbuka'); });
document.getElementById('closeSidebar').addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

menuDasbor.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'block'; areaRekap.style.display = 'none'; areaBelum.style.display = 'none';
    menuDasbor.classList.add('aktif'); menuRekap.classList.remove('aktif'); menuBelum.classList.remove('aktif');
    filterPetugas.style.display = 'block'; 
    tutupSidebar();
});

menuRekap.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; areaRekap.style.display = 'block'; areaBelum.style.display = 'none';
    menuRekap.classList.add('aktif'); menuDasbor.classList.remove('aktif'); menuBelum.classList.remove('aktif');
    
    filterPetugas.value = "Semua"; 
    filterPetugas.style.display = 'none'; 
    kalkulasi(); 
    tutupSidebar(); tampilkanRekap();
});

menuBelum.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; areaRekap.style.display = 'none'; areaBelum.style.display = 'block';
    menuBelum.classList.add('aktif'); menuDasbor.classList.remove('aktif'); menuRekap.classList.remove('aktif');
    filterPetugas.style.display = 'block'; 
    tutupSidebar(); tampilkanDaftarBelum();
});

async function mulaiAplikasi() {
    try {
        const res = await fetch(SCRIPT_URL); const json = await res.json(); dataMaster = json.data;
        isiPetugas(); kalkulasi(); tampilkanRekap();
    } catch (e) { document.getElementById('teksPersentase').innerText = "ERR"; }
}

function isiPetugas() {
    let s = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    filterPetugas.innerHTML = '<option value="Semua">SEMUA PETUGAS</option>';
    s.forEach(n => { if(n && n!=="undefined"){ let o=document.createElement('option'); o.value=n; o.text=n; filterPetugas.appendChild(o); }});
}

function getPekan(t) {
    if(!t) return "0"; let s=String(t), h=0;
    if(s.includes('/')) h=parseInt(s.split('/')[0],10);
    else if(s.includes('-')) h=parseInt(s.split('T')[0].split('-')[2],10);
    else h=new Date(s).getDate();
    return h<=7?"1":h<=14?"2":h<=21?"3":h<=31?"4":"0";
}

function kalkulasi() {
    if(!dataMaster) return;
    const fPet = filterPetugas.value;
    const fPekRaw = document.getElementById('filterPekan').value;
    const fPek = fPekRaw === "Total Bulan Ini" ? "Total" : fPekRaw.replace("Pekan ","");
    
    dataBelumBerdonasi = []; let totalRp = 0, bIns = 0;

    let idR_Global = new Set(), idIKP_Global = new Set(), idIIP_Global = new Set();
    let tO_Global = dataMaster.terima_orang.filter(b => (fPet==="Semua" || b["Nama User"]===fPet));
    tO_Global.forEach(b => { if(String(b.Spesifikasi||"").toUpperCase().includes("RUTIN")) idR_Global.add(String(b["Kode Donatur"]).trim()); });
    
    let tK_Global = dataMaster.terima_kotak.filter(b => (fPet==="Semua" || b["Nama User"]===fPet));
    tK_Global.forEach(b => {
        let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("IKP")) idIKP_Global.add(String(b["Kode Donatur"]).trim());
        if(sp.includes("IIP")) idIIP_Global.add(String(b["Kode Donatur"]).trim());
    });

    let tO_Pekan = tO_Global.filter(b => (fPek==="Total" || getPekan(b.Tanggal)===fPek));
    let bR_Pekan = 0;
    tO_Pekan.forEach(b => {
        totalRp += Number(b.Nominal||0); let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("RUTIN")) bR_Pekan++; else if(sp.includes("INSIDEN")) bIns++;
    });

    let tK_Pekan = tK_Global.filter(b => (fPek==="Total" || getPekan(b.Tanggal)===fPek));
    let bK1_Pekan = 0, bK2_Pekan = 0;
    tK_Pekan.forEach(b => {
        totalRp += Number(b.Nominal||0); let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("IKP")) bK1_Pekan++; if(sp.includes("IIP")) bK2_Pekan++;
    });

    let mR = dataMaster.master_orang.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let mK = dataMaster.master_kotak.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let kR = mR.length, kK1 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length, kK2 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length;

    let sisaRutin = 0, sisaIKP = 0, sisaIIP = 0;
    mR.forEach(b => { 
        if(!idR_Global.has(String(b["Nomor Register"]).trim())) { 
            dataBelumBerdonasi.push({n:b["Nama Donatur"], k:"RUTIN", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaRutin++; 
        }
    });
    mK.forEach(b => {
        let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
        if(sp.includes("IKP") && !idIKP_Global.has(id)) { 
            dataBelumBerdonasi.push({n:b["Nama Donatur"], k:"IKP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaIKP++; 
        } 
        else if(sp.includes("IIP") && !idIIP_Global.has(id)) { 
            dataBelumBerdonasi.push({n:b["Nama Donatur"], k:"IIP", a:b.Alamat, h:b.Hp, p:String(b.Kolektor).trim()}); sisaIIP++; 
        }
    });

    let dBaruRutin = 0, dBaruIKP = 0, dBaruIIP = 0;
    if(dataMaster.baru_orang) {
        dataMaster.baru_orang.forEach(b => {
            let pet = String(b.Kolektor || b["Nama User"] || "").trim(); let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal);
            if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) { if(String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase().includes("RUTIN")) dBaruRutin++; }
        });
    }
    if(dataMaster.baru_kotak) {
        dataMaster.baru_kotak.forEach(b => {
            let pet = String(b.Kolektor || b["Nama User"] || "").trim(); let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal);
            if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) {
                let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase();
                if(sp.includes("IKP")) dBaruIKP++; if(sp.includes("IIP")) dBaruIIP++;
            }
        });
    }

    let totalKewajiban = kR + kK1 + kK2, totalSisa = sisaRutin + sisaIKP + sisaIIP;
    let targetTerpenuhi = totalKewajiban - totalSisa; 
    let totalBerhasilPekan = bR_Pekan + bK1_Pekan + bK2_Pekan + bIns;

    document.getElementById('teksPersentase').innerText = totalKewajiban > 0 ? Math.round((targetTerpenuhi / totalKewajiban) * 100) + "%" : "0%";
    document.getElementById('teksBerhasil').innerText = totalBerhasilPekan;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalRp.toLocaleString('id-ID');
    
    document.getElementById('teksRutin').innerText = kR; document.getElementById('teksBaruRutin').innerText = "+" + dBaruRutin; document.getElementById('teksSisaRutin').innerText = "-" + sisaRutin;
    document.getElementById('teksIKP').innerText = kK1; document.getElementById('teksBaruIKP').innerText = "+" + dBaruIKP; document.getElementById('teksSisaIKP').innerText = "-" + sisaIKP;
    document.getElementById('teksIIP').innerText = kK2; document.getElementById('teksBaruIIP').innerText = "+" + dBaruIIP; document.getElementById('teksSisaIIP').innerText = "-" + sisaIIP;

    drawGrafik(bR_Pekan, bK1_Pekan, bK2_Pekan, bIns, sisaRutin, sisaIKP, sisaIIP); 
}

function drawGrafik(bR_Pekan, b1_Pekan, b2_Pekan, bIns, sRutin, sIKP, sIIP) {
    const ctx = document.getElementById('grafikUtama').getContext('2d');
    if(grafikUtama) grafikUtama.destroy();
    grafikUtama = new Chart(ctx, {
        type:'bar', 
        data:{ 
            labels:['Rutin','IKP','IIP', 'Insidental'], 
            datasets:[
                { label:'Terjemput', data:[bR_Pekan, b1_Pekan, b2_Pekan, bIns], backgroundColor:['#2E5B72','#B2C330','#4FB0C6', '#2E5B72'], borderWidth:1, borderColor:'#fff' },
                { label:'Sisa', data:[sRutin, sIKP, sIIP, 0], backgroundColor:'#E5E7EB', borderWidth:1, borderColor:'#fff' }
            ]
        },
        options:{ responsive:true, maintainAspectRatio:false, scales:{x:{stacked:true}, y:{stacked:true, beginAtZero:true}}, plugins:{legend:{display:false}} }
    });
}

function tampilkanDaftarBelum() {
    const w = document.getElementById('wadahDaftarBelum'); const f = document.getElementById('filterJenisDonatur').value;
    w.innerHTML = ""; 
    let dF = (f==="Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.k === f);
    dF.forEach(d => {
        let n = String(d.h || "").replace(/[^0-9]/g,''); if(n.startsWith('0')) n = '62' + n.substring(1);
        let p = `Assalamu'alaikum, Bapak/Ibu *${d.n}*. Kami petugas LAZ Sidogiri bermaksud menjemput donasi. Apakah ada waktu hari ini?`;
        let l = n ? `https://wa.me/${n}?text=${encodeURIComponent(p)}` : '#';
        let c = d.k === 'RUTIN' ? '#2E5B72' : (d.k === 'IKP' ? '#B2C330' : '#4FB0C6');
        w.innerHTML += `<div class="kartu-belum" style="border-left:4px solid ${c}"><div class="info-donatur"><h4>${d.n} <span class="badge" style="background:${c}">${d.k}</span></h4><p>${d.a}</p></div><a href="${l}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a></div>`;
    });
}

// --- FUNGSI TAMPILAN REKAPITULASI (DENGAN PERANKINGAN OTOMATIS) ---
function tampilkanRekap() {
    if(!dataMaster) return;
    const w = document.getElementById('wadahRekap'); w.innerHTML = "";
    const fPekRaw = document.getElementById('filterPekan').value;
    const fPek = fPekRaw === "Total Bulan Ini" ? "Total" : fPekRaw.replace("Pekan ","");

    let petugasSet = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) petugasSet.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) petugasSet.add(String(b.Kolektor).trim()); });
    let petugasArr = Array.from(petugasSet);

    let daftarRekapPetugas = [];
    const fmt = (num) => num.toLocaleString('id-ID');
    
    const renderSisaBtn = (sisa, pet, kat) => {
        if(sisa > 0) return `<div class="btn-sisa-rekap" onclick="downloadSisaRekap('${pet}', '${kat}')">${sisa} <i class="fas fa-download"></i></div>`;
        return `<span style="color: #10B981; font-weight: bold;"><i class="fas fa-check"></i></span>`; 
    };

    petugasArr.forEach(petugas => {
        let kW = { r:0, k1:0, k2:0, tot:0 }; let bD = { ins:0, r:0, k1:0, k2:0, tot:0 };
        let bR = { ins:0, r:0, k1:0, k2:0, tot:0 }; let nO = { ins:0, r:0, k1:0, k2:0, tot:0 };
        
        let idR_Glob = new Set(), idIKP_Glob = new Set(), idIIP_Glob = new Set();
        dataMaster.terima_orang.filter(b => b["Nama User"]===petugas).forEach(b => { if(String(b.Spesifikasi||"").toUpperCase().includes("RUTIN")) idR_Glob.add(String(b["Kode Donatur"]).trim()); });
        dataMaster.terima_kotak.filter(b => b["Nama User"]===petugas).forEach(b => {
            let sp = String(b.Spesifikasi||"").toUpperCase();
            if(sp.includes("IKP")) idIKP_Glob.add(String(b["Kode Donatur"]).trim());
            if(sp.includes("IIP")) idIIP_Glob.add(String(b["Kode Donatur"]).trim());
        });

        let mR = dataMaster.master_orang.filter(b => String(b.Kolektor).trim()===petugas && (fPek==="Total" || String(b.Pekan)===fPek));
        let mK = dataMaster.master_kotak.filter(b => String(b.Kolektor).trim()===petugas && (fPek==="Total" || String(b.Pekan)===fPek));
        kW.r = mR.length; kW.k1 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length; kW.k2 = mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length;
        kW.tot = kW.r + kW.k1 + kW.k2;

        let tO = dataMaster.terima_orang.filter(b => b["Nama User"]===petugas && (fPek==="Total" || getPekan(b.Tanggal)===fPek));
        tO.forEach(b => { let sp = String(b.Spesifikasi||"").toUpperCase(); let nom = Number(b.Nominal||0);
            if(sp.includes("RUTIN")) { bD.r++; nO.r += nom; } else if(sp.includes("INSIDEN")) { bD.ins++; nO.ins += nom; }
        });

        let tK = dataMaster.terima_kotak.filter(b => b["Nama User"]===petugas && (fPek==="Total" || getPekan(b.Tanggal)===fPek));
        tK.forEach(b => { let sp = String(b.Spesifikasi||"").toUpperCase(); let nom = Number(b.Nominal||0);
            if(sp.includes("IKP")) { bD.k1++; nO.k1 += nom; } if(sp.includes("IIP")) { bD.k2++; nO.k2 += nom; }
        });
        bD.tot = bD.r + bD.k1 + bD.k2 + bD.ins; nO.tot = nO.r + nO.k1 + nO.k2 + nO.ins;

        if(dataMaster.baru_orang) {
            dataMaster.baru_orang.filter(b => (String(b.Kolektor || b["Nama User"] || "").trim()===petugas) && (fPek==="Total" || (b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal))===fPek)).forEach(b => {
                let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase();
                if(sp.includes("RUTIN")) bR.r++; else if(sp.includes("INSIDEN")) bR.ins++;
            });
        }
        if(dataMaster.baru_kotak) {
            dataMaster.baru_kotak.filter(b => (String(b.Kolektor || b["Nama User"] || "").trim()===petugas) && (fPek==="Total" || (b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal))===fPek)).forEach(b => {
                let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase();
                if(sp.includes("IKP")) bR.k1++; if(sp.includes("IIP")) bR.k2++;
            });
        }
        bR.tot = bR.r + bR.k1 + bR.k2 + bR.ins;

        let sisaR = 0, sisaK1 = 0, sisaK2 = 0;
        mR.forEach(b => { if(!idR_Glob.has(String(b["Nomor Register"]).trim())) sisaR++; });
        mK.forEach(b => {
            let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
            if(sp.includes("IKP") && !idIKP_Glob.has(id)) sisaK1++; else if(sp.includes("IIP") && !idIIP_Glob.has(id)) sisaK2++;
        });
        
        let sisaTot = sisaR + sisaK1 + sisaK2;
        let persen = kW.tot > 0 ? Math.round(((kW.tot - sisaTot) / kW.tot) * 100) : 0;
        let pWarna = persen >= 80 ? 'var(--hijau-lime)' : (persen >= 50 ? '#EAB308' : '#EF4444');

        let cardHtml = `
            <div class="kartu-rekap">
                <div class="rekap-header">
                    <h3>${petugas}</h3>
                    <div class="persentase" style="color: ${pWarna}">${persen}%</div>
                </div>
                <div class="rekap-body">
                    <table class="tabel-rekap">
                        <tr><th>KAT</th><th>TARGET</th><th>MASUK</th><th>BARU</th><th>SISA</th><th>NOMINAL</th></tr>
                        <tr><td>Insidental</td><td>-</td><td>${bD.ins}</td><td>${bR.ins}</td><td>-</td><td>Rp ${fmt(nO.ins)}</td></tr>
                        <tr><td>Rutin</td><td>${kW.r}</td><td>${bD.r}</td><td>${bR.r}</td><td>${renderSisaBtn(sisaR, petugas, 'RUTIN')}</td><td>Rp ${fmt(nO.r)}</td></tr>
                        <tr><td>IKP</td><td>${kW.k1}</td><td>${bD.k1}</td><td>${bR.k1}</td><td>${renderSisaBtn(sisaK1, petugas, 'IKP')}</td><td>Rp ${fmt(nO.k1)}</td></tr>
                        <tr><td>IIP</td><td>${kW.k2}</td><td>${bD.k2}</td><td>${bR.k2}</td><td>${renderSisaBtn(sisaK2, petugas, 'IIP')}</td><td>Rp ${fmt(nO.k2)}</td></tr>
                        <tr class="jumlah"><td>JUMLAH</td><td>${kW.tot}</td><td>${bD.tot}</td><td>${bR.tot}</td><td>${sisaTot}</td><td>Rp ${fmt(nO.tot)}</td></tr>
                    </table>
                </div>
            </div>`;

        // Masukkan data beserta persentase ke dalam array sementara
        daftarRekapPetugas.push({
            persen: persen,
            html: cardHtml
        });
    });

    // --- KUNCI UTAMA: Urutkan array dari persentase terbesar ke terkecil ---
    daftarRekapPetugas.sort((a, b) => b.persen - a.persen);

    // Gabungkan seluruh HTML yang sudah berurutan untuk digambar ke layar
    let finalHtml = "";
    daftarRekapPetugas.forEach(item => {
        finalHtml += item.html;
    });
    
    w.innerHTML = finalHtml;
}

// --- FUNGSI DOWNLOAD TERISOLASI UNTUK REKAP ---
window.downloadSisaRekap = function(petugas, kategori) {
    let dataF = dataBelumBerdonasi.filter(d => d.k === kategori && d.p === petugas);
    if(dataF.length === 0) { alert("Data kosong. Tidak ada sisa " + kategori + " untuk petugas ini."); return; }
    
    let csvContent = "Nama Donatur,Kategori,Alamat,No HP,Nama Petugas\n";
    dataF.forEach(d => {
        let nama = `"${String(d.n).replace(/"/g, '""')}"`;
        let kat = `"${String(d.k).replace(/"/g, '""')}"`;
        let alamat = `"${String(d.a).replace(/"/g, '""')}"`;
        let hp = `"${String(d.h || "").replace(/"/g, '""')}"`;
        let pet = `"${String(d.p).replace(/"/g, '""')}"`;
        csvContent += `${nama},${kat},${alamat},${hp},${pet}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    let fPek = document.getElementById('filterPekan').value;
    link.setAttribute("href", url); link.setAttribute("download", `Sisa_${kategori}_${petugas}_${fPek}.csv`.replace(/ /g, "_"));
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// Event Listeners Filter
filterPetugas.addEventListener('change', kalkulasi);
document.getElementById('filterPekan').addEventListener('change', () => { kalkulasi(); tampilkanRekap(); });
document.getElementById('filterJenisDonatur').addEventListener('change', tampilkanDaftarBelum);

mulaiAplikasi();
