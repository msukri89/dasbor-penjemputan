const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikMultiLevel = null;
let dataBelumBerdonasi = []; 

// Elemen Navigasi
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnBuka = document.getElementById('openSidebar');
const btnTutup = document.getElementById('closeSidebar');
const menuDasbor = document.getElementById('menuDasbor');
const menuBelum = document.getElementById('menuBelum');
const areaDasbor = document.getElementById('areaDasbor');
const areaBelum = document.getElementById('areaBelum');

function tutupSidebar() { sidebar.classList.remove('terbuka'); overlay.classList.remove('terbuka'); }
btnBuka.addEventListener('click', () => { sidebar.classList.add('terbuka'); overlay.classList.add('terbuka'); });
btnTutup.addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

menuDasbor.addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'block'; areaBelum.style.display = 'none';
    menuDasbor.classList.add('aktif'); menuBelum.classList.remove('aktif'); tutupSidebar();
});

menuBelum.addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'none'; areaBelum.style.display = 'block';
    menuBelum.classList.add('aktif'); menuDasbor.classList.remove('aktif'); tutupSidebar();
    tampilkanDaftarBelum();
});

// Jalankan Aplikasi
async function mulaiAplikasi() {
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        isiDropdownPetugas();
        kalkulasiDasbor();
    } catch (error) {
        console.error("Fetch Error:", error);
        document.getElementById('teksPersentase').innerText = "ERR";
    }
}

function isiDropdownPetugas() {
    const dropdown = document.getElementById('filterPetugas');
    let daftarPetugas = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dropdown.innerHTML = '<option value="Semua">Semua Petugas</option>';
    daftarPetugas.forEach(nama => {
        let opsi = document.createElement('option'); opsi.value = nama; opsi.text = nama; dropdown.appendChild(opsi);
    });
}

function tentukanPekanTransaksi(tglStr) {
    if (!tglStr) return "0";
    let str = String(tglStr);
    let hari = 0;
    try {
        if (str.includes('/')) { hari = parseInt(str.split('/')[0], 10); } 
        else if (str.includes('-')) { hari = parseInt(str.split('T')[0].split('-')[2], 10); } 
        else { let d = new Date(str); hari = d.getDate(); }
    } catch(e) { return "0"; }
    if (hari >= 1 && hari <= 7) return "1";
    if (hari >= 8 && hari <= 14) return "2";
    if (hari >= 15 && hari <= 21) return "3";
    if (hari >= 22) return "4";
    return "0";
}

function kalkulasiDasbor() {
    if (!dataMaster) return;
    const filterPetugas = document.getElementById('filterPetugas').value;
    const filterPekan = document.getElementById('filterPekan').value;
    const pekanAngka = filterPekan.replace("Pekan ", ""); 
    
    dataBelumBerdonasi = [];
    let totalKewajiban = 0, totalBerhasil = 0, totalPemasukan = 0;

    // --- LOGIKA PERORANGAN (Rutin) ---
    let masterOrangFilter = dataMaster.master_orang.filter(b => 
        (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka)
    );
    let terimaOrangFilter = dataMaster.terima_orang.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    );
    let idUnikOrang = new Set(terimaOrangFilter.map(b => String(b["Kode Donatur"]).trim()));
    terimaOrangFilter.forEach(b => totalPemasukan += Number(b.Nominal || 0));

    // --- LOGIKA KOTAK (IKP & IIP) ---
    let masterKotakFilter = dataMaster.master_kotak.filter(b => 
        (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka)
    );
    let terimaKotakFilter = dataMaster.terima_kotak.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    );

    let idUnikIKP = new Set(), idUnikIIP = new Set();
    terimaKotakFilter.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let spesifikasi = String(b.Spesifikasi).toUpperCase();
        if (spesifikasi === "IKP") idUnikIKP.add(String(b["Kode Donatur"]).trim());
        if (spesifikasi === "IIP") idUnikIIP.add(String(b["Kode Donatur"]).trim());
    });

    // --- PENYUSUNAN DATA BELUM BERDONASI ---
    masterOrangFilter.forEach(b => {
        if (!idUnikOrang.has(String(b["Nomor Register"]).trim())) {
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: "RUTIN", alamat: b.Alamat, hp: b.Hp, badge: 'badge-rutin' });
        }
    });
    masterKotakFilter.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        let jenis = String(b.Spesifikasi).toUpperCase();
        let sudah = (jenis === "IKP" && idUnikIKP.has(idReg)) || (jenis === "IIP" && idUnikIIP.has(idReg));
        if (!sudah) {
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: jenis, alamat: b.Alamat, hp: b.Hp, badge: jenis === 'IKP' ? 'badge-ikp' : 'badge-iip' });
        }
    });

    // --- REKAPITULASI ---
    let bRutin = masterOrangFilter.filter(b => idUnikOrang.has(String(b["Nomor Register"]).trim())).length;
    let kRutin = masterOrangFilter.length;
    let bIKP = masterKotakFilter.filter(b => b.Spesifikasi === "IKP" && idUnikIKP.has(String(b["Nomor Register"]).trim())).length;
    let kIKP = masterKotakFilter.filter(b => b.Spesifikasi === "IKP").length;
    let bIIP = masterKotakFilter.filter(b => b.Spesifikasi === "IIP" && idUnikIIP.has(String(b["Nomor Register"]).trim())).length;
    let kIIP = masterKotakFilter.filter(b => b.Spesifikasi === "IIP").length;

    totalKewajiban = kRutin + kIKP + kIIP;
    totalBerhasil = bRutin + bIKP + bIIP;
    let persentase = totalKewajiban === 0 ? 0 : Math.round((totalBerhasil / totalKewajiban) * 100);

    document.getElementById('teksPersentase').innerText = persentase + "%";
    document.getElementById('teksKewajiban').innerText = totalKewajiban;
    document.getElementById('teksBerhasil').innerText = totalBerhasil;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    renderGrafikTerpadu(bRutin, kRutin, bIKP, kIKP, bIIP, kIIP);
}

function tampilkanDaftarBelum() {
    const wadah = document.getElementById('wadahDaftarBelum');
    const filterJenis = document.getElementById('filterJenisDonatur').value;
    wadah.innerHTML = ""; 

    let dataFiltered = (filterJenis === "Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.kategori === filterJenis);

    if (dataFiltered.length === 0) {
        wadah.innerHTML = "<p style='text-align:center; color:#9CA3AF; margin-top:20px;'>Tidak ada data sisa penjemputan.</p>";
        return;
    }

    dataFiltered.forEach(donatur => {
        let noHp = String(donatur.hp || "").replace(/[^0-9]/g, '');
        if (noHp.startsWith('0')) noHp = '62' + noHp.substring(1); 
        let linkWa = noHp ? `https://wa.me/${noHp}` : '#';
        let warnaBorder = donatur.kategori === 'RUTIN' ? '#2E5B72' : (donatur.kategori === 'IKP' ? '#B2C330' : '#4FB0C6');
        
        wadah.innerHTML += `
            <div class="kartu-belum" style="border-left: 5px solid ${warnaBorder}">
                <div class="info-teks">
                    <h4>${donatur.nama} <span class="badge ${donatur.badge}">${donatur.kategori}</span></h4>
                    <p class="alamat-teks"><i class="fas fa-map-marker-alt"></i> ${donatur.alamat}</p>
                </div>
                <a href="${linkWa}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a>
            </div>`;
    });
}

function renderGrafikTerpadu(bRutin, kRutin, bIKP, kIKP, bIIP, kIIP) {
    const ctx = document.getElementById('grafikMultiLevel').getContext('2d');
    if (grafikMultiLevel) grafikMultiLevel.destroy();
    
    grafikMultiLevel = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [
                {
                    label: 'Rutin',
                    data: [bRutin, kRutin - bRutin],
                    backgroundColor: ['#2E5B72', '#E5E7EB'],
                    borderWidth: 0
                },
                {
                    label: 'IKP',
                    data: [bIKP, kIKP - bIKP],
                    backgroundColor: ['#B2C330', '#E5E7EB'],
                    borderWidth: 0
                },
                {
                    label: 'IIP',
                    data: [bIIP, kIIP - bIIP],
                    backgroundColor: ['#4FB0C6', '#E5E7EB'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '30%',
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            let label = item.dataset.label || '';
                            let value = item.raw;
                            let status = item.dataIndex === 0 ? "Berhasil" : "Sisa";
                            return label + " (" + status + "): " + value;
                        }
                    }
                }
            }
        }
    });
}

document.getElementById('filterPetugas').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterPekan').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterJenisDonatur').addEventListener('change', tampilkanDaftarBelum);

mulaiAplikasi();
