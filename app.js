const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";
let dataMaster = null; let grafikUtama = null; let dataBelumBerdonasi = [];

const sidebar = document.getElementById('sidebar'); 
const overlay = document.getElementById('overlay');
const areaDasbor = document.getElementById('areaDasbor'); 
const areaBelum = document.getElementById('areaBelum');

function tutupSidebar() { sidebar.classList.remove('terbuka'); overlay.classList.remove('terbuka'); }
document.getElementById('openSidebar').addEventListener('click', () => { sidebar.classList.add('terbuka'); overlay.classList.add('terbuka'); });
document.getElementById('closeSidebar').addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

document.getElementById('menuDasbor').addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'block'; areaBelum.style.display = 'none';
    document.getElementById('menuDasbor').classList.add('aktif'); document.getElementById('menuBelum').classList.remove('aktif');
    tutupSidebar();
});

document.getElementById('menuBelum').addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'none'; areaBelum.style.display = 'block';
    document.getElementById('menuBelum').classList.add('aktif'); document.getElementById('menuDasbor').classList.remove('aktif');
    tutupSidebar(); tampilkanDaftarBelum();
});

async function mulaiAplikasi() {
    try {
        const res = await fetch(SCRIPT_URL); const json = await res.json(); dataMaster = json.data;
        isiPetugas(); kalkulasi();
    } catch (e) { document.getElementById('teksPersentase').innerText = "ERR"; }
}

function isiPetugas() {
    const d = document.getElementById('filterPetugas'); let s = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) s.add(String(b.Kolektor).trim()); });
    d.innerHTML = '<option value="Semua">SEMUA PETUGAS</option>';
    s.forEach(n => { if(n && n!=="undefined"){ let o=document.createElement('option'); o.value=n; o.text=n; d.appendChild(o); }});
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
    const fPet = document.getElementById('filterPetugas').value;
    const fPekRaw = document.getElementById('filterPekan').value;
    const fPek = fPekRaw === "Total Bulan Ini" ? "Total" : fPekRaw.replace("Pekan ","");
    
    dataBelumBerdonasi = []; let totalRp = 0, bIns = 0;

    // --- PROSES TERIMA (REALISASI) ---
    let tO = dataMaster.terima_orang.filter(b => (fPet==="Semua" || b["Nama User"]===fPet) && (fPek==="Total" || getPekan(b.Tanggal)===fPek));
    let idR = new Set();
    tO.forEach(b => {
        totalRp += Number(b.Nominal||0);
        let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("RUTIN")) idR.add(String(b["Kode Donatur"]).trim());
        else if(sp.includes("INSIDEN")) bIns++;
    });

    let tK = dataMaster.terima_kotak.filter(b => (fPet==="Semua" || b["Nama User"]===fPet) && (fPek==="Total" || getPekan(b.Tanggal)===fPek));
    let idIKP = new Set(), idIIP = new Set();
    tK.forEach(b => {
        totalRp += Number(b.Nominal||0);
        let sp = String(b.Spesifikasi||"").toUpperCase();
        if(sp.includes("IKP")) idIKP.add(String(b["Kode Donatur"]).trim());
        if(sp.includes("IIP")) idIIP.add(String(b["Kode Donatur"]).trim());
    });

    // --- PROSES MASTER (KEWAJIBAN) ---
    let mR = dataMaster.master_orang.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let mK = dataMaster.master_kotak.filter(b => (fPet==="Semua" || String(b.Kolektor).trim()===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));

    mR.forEach(b => { if(!idR.has(String(b["Nomor Register"]).trim())) dataBelumBerdonasi.push({n:b["Nama Donatur"], k:"RUTIN", a:b.Alamat, h:b.Hp, b:'badge-rutin'}); });
    mK.forEach(b => {
        let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
        let s=(sp.includes("IKP")&&idIKP.has(id)) || (sp.includes("IIP")&&idIIP.has(id));
        if(!s) dataBelumBerdonasi.push({n:b["Nama Donatur"], k:sp.includes("IKP")?"IKP":"IIP", a:b.Alamat, h:b.Hp, b:sp.includes("IKP")?'badge-ikp':'badge-iip'});
    });

    // --- PROSES DONATUR BARU ---
    let dBaruRutin = 0, dBaruIKP = 0, dBaruIIP = 0;
    
    if(dataMaster.baru_orang) {
        dataMaster.baru_orang.forEach(b => {
            let pet = String(b.Kolektor || b["Nama User"] || "").trim();
            let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal);
            if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) {
                let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase();
                if(sp.includes("RUTIN")) dBaruRutin++;
            }
        });
    }

    if(dataMaster.baru_kotak) {
        dataMaster.baru_kotak.forEach(b => {
            let pet = String(b.Kolektor || b["Nama User"] || "").trim();
            let pek = b.Pekan ? String(b.Pekan).trim() : getPekan(b.Tanggal);
            if((fPet === "Semua" || pet === fPet) && (fPek === "Total" || pek === fPek)) {
                let sp = String(b.Spesifikasi || b["Jenis Donatur"] || "").toUpperCase();
                if(sp.includes("IKP")) dBaruIKP++;
                if(sp.includes("IIP")) dBaruIIP++;
            }
        });
    }

    // --- STATISTIK AKHIR ---
    let bR=idR.size, bK1=idIKP.size, bK2=idIIP.size;
    let kR=mR.length, kK1=mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length, kK2=mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length;

    let totalKewajiban = kR + kK1 + kK2;
    let totalBerhasil = bR + bK1 + bK2 + bIns;

    // Update Kartu Utama
    document.getElementById('teksPersentase').innerText = totalKewajiban > 0 ? Math.round(((bR + bK1 + bK2) / totalKewajiban) * 100) + "%" : "0%";
    document.getElementById('teksBerhasil').innerText = totalBerhasil;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalRp.toLocaleString('id-ID');
    
    // Update Kartu Kewajiban 3 Tingkat
    document.getElementById('teksRutin').innerText = kR;
    document.getElementById('teksBaruRutin').innerText = "+" + dBaruRutin;
    document.getElementById('teksSisaRutin').innerText = "-" + Math.max(0, kR - bR);

    document.getElementById('teksIKP').innerText = kK1;
    document.getElementById('teksBaruIKP').innerText = "+" + dBaruIKP;
    document.getElementById('teksSisaIKP').innerText = "-" + Math.max(0, kK1 - bK1);

    document.getElementById('teksIIP').innerText = kK2;
    document.getElementById('teksBaruIIP').innerText = "+" + dBaruIIP;
    document.getElementById('teksSisaIIP').innerText = "-" + Math.max(0, kK2 - bK2);

    drawGrafik(bR, kR, bK1, kK1, bK2, kK2, bIns); 
}

function drawGrafik(bR, kR, b1, k1, b2, k2, bIns) {
    const ctx = document.getElementById('grafikUtama').getContext('2d');
    if(grafikUtama) grafikUtama.destroy();
    grafikUtama = new Chart(ctx, {
        type:'bar', 
        data:{ 
            labels:['RUTIN','IKP','IIP', 'INSIDENTAL'], 
            datasets:[
                {
                    label:'Berhasil', 
                    data:[bR, b1, b2, bIns], 
                    backgroundColor:['#2E5B72','#B2C330','#4FB0C6', '#2E5B72'], 
                    borderWidth:1, 
                    borderColor:'#fff'
                },
                {
                    label:'Sisa', 
                    data:[Math.max(0,kR-bR), Math.max(0,k1-b1), Math.max(0,k2-b2), 0], 
                    backgroundColor:'#E5E7EB', 
                    borderWidth:1, 
                    borderColor:'#fff'
                }
            ]
        },
        options:{ 
            responsive:true, 
            maintainAspectRatio:false, 
            scales:{x:{stacked:true}, y:{stacked:true, beginAtZero:true}}, 
            plugins:{legend:{display:false}}
        }
    });
}

function tampilkanDaftarBelum() {
    const w = document.getElementById('wadahDaftarBelum'); 
    const f = document.getElementById('filterJenisDonatur').value;
    w.innerHTML = ""; 
    let dF = (f==="Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.k === f);
    
    dF.forEach(d => {
        let n = String(d.h || "").replace(/[^0-9]/g,''); 
        if(n.startsWith('0')) n = '62' + n.substring(1);
        let p = `_Assalamu'alaikum,_ Bapak/Ibu *${d.n}*.

Semoga kesehatan dan lindungan Allah swt. senantiasa menyertai Bapak/Ibu beserta keluarga. _Aamiin._

​Kami dari LAZ Sidogiri ingin mengucapkan terima kasih. Berkat kebaikan dan donasi Bapak/Ibu sebelumnya, amanah tersebut telah tersalurkan dengan baik dan sangat membantu para penerima manfaat.

​Jika Bapak/Ibu berkenan untuk kembali berpartisipasi bulan ini, petugas kami siap membantu menjemput donasi. Apakah sekiranya Bapak/Ibu ada waktu luang hari ini, atau adakah hari lain yang lebih pas?

_​Wassalamu'alaikum Warahmatullahi Wabarakatuh_ 🙏`;
        let l = n ? `https://wa.me/${n}?text=${encodeURIComponent(p)}` : '#';
        let c = d.k === 'RUTIN' ? '#2E5B72' : (d.k === 'IKP' ? '#B2C330' : '#4FB0C6');
        
        w.innerHTML += `
            <div class="kartu-belum" style="border-left:4px solid ${c}">
                <div class="info-donatur">
                    <h4>${d.n} <span class="badge" style="background:${c}">${d.k}</span></h4>
                    <p>${d.a}</p>
                </div>
                <a href="${l}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a>
            </div>`;
    });
}

// --- FUNGSI DOWNLOAD OTOMATIS EXCEL/CSV ---
function downloadDataSisa(kategori) {
    let dataF = dataBelumBerdonasi.filter(d => d.k === kategori);
    if(dataF.length === 0) {
        alert("Pekerjaan Tuntas! Tidak ada sisa penjemputan untuk " + kategori + ".");
        return;
    }

    // Header CSV
    let csvContent = "Nama Donatur,Kategori,Alamat,No HP\n";
    
    dataF.forEach(d => {
        let nama = `"${String(d.n).replace(/"/g, '""')}"`;
        let kat = `"${String(d.k).replace(/"/g, '""')}"`;
        let alamat = `"${String(d.a).replace(/"/g, '""')}"`;
        let hp = `"${String(d.h || "").replace(/"/g, '""')}"`;
        csvContent += `${nama},${kat},${alamat},${hp}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    let fPet = document.getElementById('filterPetugas').value;
    let fPek = document.getElementById('filterPekan').value;
    let namaFile = `Sisa_${kategori}_${fPet}_${fPek}.csv`.replace(/ /g, "_");

    link.setAttribute("href", url);
    link.setAttribute("download", namaFile);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('filterPetugas').addEventListener('change', kalkulasi);
document.getElementById('filterPekan').addEventListener('change', kalkulasi);
document.getElementById('filterJenisDonatur').addEventListener('change', tampilkanDaftarBelum);
mulaiAplikasi();
