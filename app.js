'use strict';
const $ = s => document.querySelector(s);
const config = window.DIREZ_CONFIG || {};
const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const specs = {
  identity: [['name','Nama lengkap'],['class','Kelas'],['attendance','Absen','number'],['whatsapp','Nomor WhatsApp','tel'],['sd','Asal sekolah — SD'],['smp','Asal sekolah — SMP'],['school','Asal sekolah — SMK/SMA']],
  skill: [['html','HTML & CSS (%)','number'],['javascript','JavaScript (%)','number'],['python','Python (%)','number'],['java','Java (%)','number']],
  concept: [['theme','Tema portofolio'],['style','Style/desain yang diinginkan'],['color','Warna favorit'],['reference','Referensi desain (tulis “Tidak ada” jika tidak ada)']],
  request: [['features','Fitur yang ingin ditambahkan','textarea'],['pages','Halaman yang dibutuhkan','textarea'],['notes','Catatan lainnya','textarea']]
};
const labels = Object.fromEntries(Object.values(specs).flat().map(([k,v])=>[k,v]));
let state = {slots:0,price:30000,version:0};
let session = null, orders = [], offset = 0, loaded = false, loadingOrders = false;
let submissionKey = crypto.randomUUID();
const objectURLs = [];
const node = (tag, text, cls) => {const e=document.createElement(tag); if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
for (const [group, fields] of Object.entries(specs)) {
  for (const [name,title,type='text'] of fields) {
    const label=node('label',title);const input=document.createElement(type==='textarea'?'textarea':'input');
    input.name=name;input.required=group!=='request';
    if(type!=='textarea') input.type=type;
    if(type==='number'){input.min=group==='skill'?'0':'1';input.max=group==='skill'?'100':'999';input.step='1';}
    else input.maxLength=group==='request'?2000:500;
    if(name==='whatsapp'){input.pattern='(?:\\+62|62|0)8[0-9]{8,11}';input.placeholder='Contoh: 081234567890';input.autocomplete='tel';input.title='Gunakan nomor Indonesia, contoh 081234567890, tanpa spasi.';}
    if(name==='name')input.autocomplete='name';
    label.append(input);$('#'+group+'-fields').append(label);
  }
}
$('#year').textContent=new Date().getFullYear();

async function storeAction(name,body={},admin=false){
  if(admin&&config.ADMIN_REQUIRE_LOGIN&&!session)throw new Error('Silakan login demo dahulu.');
  if(name==='settings'){
    const res = await fetch('/api/settings');
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Gagal terhubung ke database server.');
    return data;
  }
  if(name==='place_order'){
    const res = await fetch('/api/place_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Gagal menyimpan pesanan ke database.');
    return data;
  }
  if(name==='update_settings'){
    const res = await fetch('/api/update_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Gagal memperbarui slot/harga.');
    return data;
  }
  if(name==='list_orders'){
    const start = body.p_offset || 0;
    const res = await fetch('/api/list_orders?offset=' + start);
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Gagal mengambil pesanan dari database.');
    return data;
  }
  if(name==='order_detail'){
    const res = await fetch('/api/order_detail/' + body.p_id);
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Pesanan tidak ditemukan.');
    return data;
  }
  if(name==='order_status'){
    const res = await fetch('/api/order_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Gagal mengedit status pesanan.');
    return data;
  }
  throw new Error('Aksi tidak dikenal.');
}

function renderStock(){
  $('#slot-count').textContent=state.slots;
  $('#price').textContent=money(state.price);
  $('#form-price').textContent='Total pembayaran: '+money(state.price);
  $('#availability').textContent=state.slots>0?'● SLOT PEMESANAN DIBUKA':'SLOT PENUH — SAMPAI JUMPA DI BATCH BERIKUTNYA';
  $('#book').disabled=state.slots<1;
  $('#book').textContent=state.slots>0?'AMBIL SLOT SAYA →':'SLOT HABIS';
  $('#slot-grid').replaceChildren(...Array.from({length:12},(_,i)=>node('i',undefined,i<Math.min(state.slots,12)?'':'empty')));
}
async function loadStock(){
  try{state=await storeAction('settings');renderStock();$('#connection').textContent='';}
  catch(e){$('#connection').textContent=e.message;$('#book').disabled=true;$('#availability').textContent='PEMESANAN BELUM TERSEDIA';}
}
$('#book').onclick=()=>{$('#success').hidden=true;$('#order-section').hidden=false;$('#order-section').scrollIntoView({behavior:'smooth'});};
$('#close-form').onclick=()=>{$('#order-section').hidden=true;$('#book').focus();};
function validateFiles(){
  const files=[...$('#attachments').files];
  if(files.length>4)throw new Error('Maksimal 4 lampiran.');
  for(const file of files){if(file.size>1048576)throw new Error(file.name+' melebihi 1 MB.');if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type))throw new Error('Gunakan JPG, PNG, WebP, atau PDF.');}
  return files;
}
$('#attachments').onchange=()=>{try{$('#file-list').textContent=validateFiles().map(f=>f.name).join(' • ');$('#order-error').textContent='';}catch(e){$('#order-error').textContent=e.message;$('#file-list').textContent='Lampiran perlu diperbaiki.';}};
const fileData=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type,data:reader.result.split(',')[1]});reader.onerror=()=>reject(new Error('Lampiran tidak dapat dibaca.'));reader.readAsDataURL(file);});
$('#order-form').onsubmit=async event=>{
  event.preventDefault();const button=$('#submit-order');button.disabled=true;button.textContent='MENYIMPAN…';$('#order-error').textContent='';
  try{
    const data=Object.fromEntries(new FormData(event.target));for(const k in data)data[k]=String(data[k]).trim();
    for(const [group,fields] of Object.entries(specs))if(group!=='request')for(const [key,label]of fields)if(!data[key])throw new Error(label+' wajib diisi.');
    const attachments=await Promise.all(validateFiles().map(fileData));
    const result=await storeAction('place_order',{p_key:submissionKey,p_data:data,p_attachments:attachments,p_expected_price:state.price});
    $('#order-section').hidden=true;$('#success').hidden=false;
    $('#payment-message').textContent='Silakan bayar besok '+money(result.price)+'.';
    $('#receipt').textContent='Kode pesanan: '+result.id+' • Simpan kode ini atau screenshot halaman ini.';
    $('#success').focus();$('#success').scrollIntoView({behavior:'smooth'});
    event.target.reset();$('#file-list').textContent='';submissionKey=crypto.randomUUID();await loadStock();
  }catch(e){$('#order-error').textContent=e.message;await loadStock();}
  finally{button.disabled=false;button.textContent='KIRIM PESANAN →';}
};
let taps=0,lastTap=0;
$('#secret').onclick=()=>{const now=Date.now();taps=now-lastTap>1800?1:taps+1;lastTap=now;if(taps===5){taps=0;if(!config.ADMIN_REQUIRE_LOGIN||session)openAdmin();else $('#login-dialog').showModal();}};
for(const el of document.querySelectorAll('[data-close]'))el.onclick=()=>$('#'+el.dataset.close).close();
$('#login-form').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;$('#login-error').textContent='';
  try{const data=Object.fromEntries(new FormData(event.target));if(data.email!==config.ADMIN_EMAIL||data.password!==config.ADMIN_PASSWORD)throw new Error('Email atau password demo salah. Periksa config.js.');session={demo:true};event.target.reset();$('#login-dialog').close();await openAdmin();}
  catch(e){session=null;$('#login-error').textContent=e.message;}finally{button.disabled=false;}
};
async function openAdmin(){
  if(!$('#admin-dialog').open)$('#admin-dialog').showModal();
  try{state=await storeAction('settings');$('#settings-form').elements.slots.value=state.slots;$('#settings-form').elements.price.value=state.price;renderStock();await loadOrders(true);}catch(e){$('#admin-message').textContent=e.message;}
}
$('#settings-form').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{state=await storeAction('update_settings',{p_slots:Number(event.target.elements.slots.value),p_price:Number(event.target.elements.price.value),p_version:state.version},true);renderStock();$('#admin-message').textContent='Slot dan harga berhasil disimpan.';}
  catch(e){$('#admin-message').textContent=e.message;await loadStock();event.target.elements.slots.value=state.slots;event.target.elements.price.value=state.price;}
  finally{button.disabled=false;}
};
async function loadOrders(reset){
  if(loadingOrders)return;loadingOrders=true;$('#refresh-orders').disabled=true;$('#more-orders').disabled=true;
  try{
    const start=reset?0:offset;
    const result=await storeAction('list_orders',{p_offset:start},true);
    if(reset){orders=[];$('#orders').replaceChildren();}orders.push(...result);offset=start+result.length;loaded=true;
    for(const order of result){
      const row=node('article',undefined,'order-card'),info=node('div');info.append(node('h4',order.name),node('p',new Date(order.created_at).toLocaleString('id-ID')+' • '+money(order.price)),node('span',order.status,'status-pill'));
      const button=node('button','Lihat detail →','text-btn');button.onclick=()=>showDetail(order.id);row.append(info,button);$('#orders').append(row);
    }
    if(!orders.length)$('#orders').append(node('p','Belum ada pesanan. Pesanan baru akan muncul di sini.','small'));
    $('#more-orders').hidden=result.length<25;
  }catch(e){$('#admin-message').textContent=e.message;}finally{loadingOrders=false;$('#refresh-orders').disabled=false;$('#more-orders').disabled=false;}
}
$('#refresh-orders').onclick=()=>loadOrders(true);$('#more-orders').onclick=()=>loadOrders(false);
async function showDetail(id){
  const target=$('#order-detail');target.replaceChildren(node('p','Memuat pesanan…'));$('#detail-dialog').showModal();
  try{
    const order=await storeAction('order_detail',{p_id:id},true);target.replaceChildren();
    target.append(node('p',order.id+' • '+new Date(order.created_at).toLocaleString('id-ID'),'small'),node('h3',money(order.price)+' • '+order.status));
    const dl=node('dl',undefined,'detail-grid');for(const [key,title]of Object.entries(labels)){const item=node('div',undefined,'detail-item');item.append(node('dt',title),node('dd',order.data[key]||'—'));dl.append(item);}target.append(dl,node('h3','Lampiran'));
    if(!order.attachments.length)target.append(node('p','Tidak ada lampiran.','small'));
    for(const file of order.attachments){const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:file.type}));objectURLs.push(url);const link=node('a','↓ '+file.name,'file-download');link.href=url;link.download=file.name;target.append(link);}
    const actions=node('div',undefined,'admin-actions');const wa=node('a','Hubungi via WhatsApp ↗','btn primary');const phone=order.data.whatsapp.replace(/^\+/, '').replace(/^0/,'62');wa.href='https://wa.me/'+phone;wa.target='_blank';wa.rel='noopener noreferrer';
    const select=document.createElement('select');select.setAttribute('aria-label','Status pesanan');for(const status of ['Baru','Terkonfirmasi','Selesai']){const option=node('option',status);option.value=status;select.append(option);}select.value=order.status;
    const save=node('button','Simpan status','text-btn');const message=node('p',undefined,'small');message.setAttribute('role','status');save.onclick=async()=>{save.disabled=true;try{await storeAction('order_status',{p_id:id,p_status:select.value},true);message.textContent='Status tersimpan.';await loadOrders(true);}catch(e){message.textContent=e.message;}finally{save.disabled=false;}};actions.append(wa,select,save);target.append(actions,message);
  }catch(e){target.replaceChildren(node('p',e.message,'error'));}
}
$('#detail-dialog').addEventListener('close',()=>{for(const url of objectURLs)URL.revokeObjectURL(url);objectURLs.length=0;});
$('#logout').textContent=config.ADMIN_REQUIRE_LOGIN?'Keluar akun':'Tutup admin';
$('#logout').onclick=()=>{session=null;orders=[];$('#orders').replaceChildren();$('#order-detail').replaceChildren();$('#admin-dialog').close();};
loadStock();
setInterval(()=>{if(!document.hidden&&!$('#admin-dialog').open)loadStock();},30000);
