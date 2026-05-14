const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";
let dataMaster = null; let grafikUtama = null; let grafikInsidental = null; let dataBelumBerdonasi = [];

const sidebar = document.getElementById('sidebar'); 
const overlay = document.getElementById('overlay');
const areaDasbor = document.getElementById('areaDasbor'); 
const areaBelum = document.getElementById('areaBelum');

// Fungsi Sidebar
function tutupSidebar() { 
    sidebar.classList.remove('terbuka'); 
    overlay.classList.remove('terbuka'); 
}

document.getElementById('openSidebar').addEventListener('click', () => { 
    sidebar.classList.add('terbuka'); 
    overlay.classList.add('terbuka'); 
});

document.getElementById('closeSidebar').addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

// Pindah Halaman
document.getElementById('menuDasbor').addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'block'; 
    areaBelum.style.display = 'none';
    document.getElementById('menuDasbor').classList.add('aktif');
    document.getElementById('menuBelum').classList.remove('aktif');
    tutupSidebar();
});

document.getElementById('menuBelum').addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; 
    areaBelum.style.display = 'block';
    document.getElementById('menuBelum').classList.add('aktif');
    document.getElementById('menuDasbor').classList.remove('aktif');
    tutupSidebar(); 
    tampilkanDaftarBelum();
});

// Sisanya (mulaiAplikasi, kalkulasi, drawGrafik) tetap sama seperti sebelumnya
// Pastikan tampilkanDaftarBelum menggunakan struktur HTML baru di CSS:

function tampilkanDaftarBelum() {
    const w = document.getElementById('wadahDaftarBelum'); 
    const f = document.getElementById('filterJenisDonatur').value;
    w.innerHTML = ""; 
    let dF = (f==="Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.k === f);
    
    dF.forEach(d => {
        let n = String(d.h || "").replace(/[^0-9]/g,''); 
        if(n.startsWith('0')) n = '62' + n.substring(1);
        let p = `Assalamu'alaikum, Bapak/Ibu *${d.n}*. Kami petugas LAZ Sidogiri bermaksud menjemput donasi. Apakah ada waktu hari ini?`;
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

// ... Sertakan fungsi mulaiAplikasi(), kalkulasi(), drawGrafik() Anda di bawah sini ...
async function mulaiAplikasi() {
    try {
        const res = await fetch(SCRIPT_URL); const json = await res.json(); dataMaster = json.data;
        isiPetugas(); kalkulasi();
    } catch (e) { document.getElementById('teksPersentase').innerText = "ERR"; }
}

function isiPetugas() {
    const d = document.getElementById('filterPetugas'); let s = new Set();
    dataMaster.master_orang.forEach(b => s.add(String(b.Kolektor).trim()));
    dataMaster.master_kotak.forEach(b => s.add(String(b.Kolektor).trim()));
    d.innerHTML = '<option value="Semua">Semua Petugas</option>';
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
    const fPek = document.getElementById('filterPekan').value.replace("Pekan ","");
    dataBelumBerdonasi = []; let totalRp = 0, bIns = 0;

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

    let mR = dataMaster.master_orang.filter(b => (fPet==="Semua" || b.Kolektor===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));
    let mK = dataMaster.master_kotak.filter(b => (fPet==="Semua" || b.Kolektor===fPet) && (fPek==="Total" || String(b.Pekan)===fPek));

    mR.forEach(b => { if(!idR.has(String(b["Nomor Register"]).trim())) dataBelumBerdonasi.push({n:b["Nama Donatur"], k:"RUTIN", a:b.Alamat, h:b.Hp, b:'badge-rutin'}); });
    mK.forEach(b => {
        let id=String(b["Nomor Register"]).trim(), sp=String(b.Spesifikasi).toUpperCase();
        let s=(sp.includes("IKP")&&idIKP.has(id)) || (sp.includes("IIP")&&idIIP.has(id));
        if(!s) dataBelumBerdonasi.push({n:b["Nama Donatur"], k:sp.includes("IKP")?"IKP":"IIP", a:b.Alamat, h:b.Hp, b:sp.includes("IKP")?'badge-ikp':'badge-iip'});
    });

    let bR=idR.size, bK1=idIKP.size, bK2=idIIP.size, kR=mR.length, kK1=mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IKP")).length, kK2=mK.filter(b=>String(b.Spesifikasi).toUpperCase().includes("IIP")).length;
    let tTotalK = kR+kK1+kK2, tTotalB = bR+bK1+bK2+bIns;
    document.getElementById('teksPersentase').innerText = tTotalK>0?Math.round(((bR+bK1+bK2)/tTotalK)*100)+"%":"0%";
    document.getElementById('teksKewajiban').innerText = tTotalK;
    document.getElementById('teksBerhasil').innerText = tTotalB;
    document.getElementById('teksPemasukan').innerText = "Rp "+totalRp.toLocaleString('id-ID');

    drawGrafik(bR, kR, bK1, kK1, bK2, kK2); drawIns(bIns);
}

function drawGrafik(bR, kR, b1, k1, b2, k2) {
    const ctx = document.getElementById('grafikUtama').getContext('2d');
    if(grafikUtama) grafikUtama.destroy();
    grafikUtama = new Chart(ctx, {
        type:'bar', data:{ labels:['Rutin','IKP','IIP'], datasets:[
            {label:'B', data:[bR, b1, b2], backgroundColor:['#2E5B72','#B2C330','#4FB0C6'], borderWidth:1, borderColor:'#fff'},
            {label:'S', data:[Math.max(0,kR-bR), Math.max(0,k1-b1), Math.max(0,k2-b2)], backgroundColor:'#E5E7EB', borderWidth:1, borderColor:'#fff'}
        ]},
        options:{ responsive:true, maintainAspectRatio:false, scales:{x:{stacked:true}, y:{stacked:true, beginAtZero:true}}, plugins:{legend:{display:false}}}
    });
}

function drawIns(j) {
    const ctx = document.getElementById('grafikInsidental').getContext('2d');
    if(grafikInsidental) grafikInsidental.destroy();
    grafikInsidental = new Chart(ctx, {
        type:'bar', data:{ labels:['Insidental'], datasets:[{data:[j], backgroundColor:'#2E5B72', borderWidth:1, borderColor:'#fff', barThickness:20}]},
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, scales:{x:{beginAtZero:true, ticks:{stepSize:1}}}, plugins:{legend:{display:false}}}
    });
}

mulaiAplikasi();
