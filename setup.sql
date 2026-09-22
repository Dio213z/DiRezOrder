-- Jalankan SATU KALI di Supabase SQL Editor pada project baru.
-- Seluruh pesanan/lampiran privat. Pengunjung hanya boleh menjalankan fungsi pemesanan.
begin;
create table public.direz_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.direz_settings (id integer primary key check(id=1), slots integer not null check(slots between 0 and 999), price integer not null check(price between 1000 and 10000000), version bigint not null default 0);
insert into public.direz_settings(id,slots,price) values(1,10,30000);
create table public.direz_orders (
 id uuid primary key default gen_random_uuid(), request_key uuid not null unique,
 created_at timestamptz not null default now(), price integer not null,
 status text not null default 'Baru' check(status in ('Baru','Terkonfirmasi','Selesai')),
 data jsonb not null, attachments jsonb not null default '[]'
);
create index direz_orders_date on public.direz_orders(created_at desc);
alter table public.direz_admins enable row level security;
alter table public.direz_settings enable row level security;
alter table public.direz_orders enable row level security;
revoke all on public.direz_admins, public.direz_settings, public.direz_orders from anon, authenticated;

create function public.direz_admin_check() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.direz_admins where user_id=auth.uid()) then raise exception 'Akses khusus admin.'; end if;
 return true;
end; $$;

create function public.direz_public_settings() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('slots',slots,'price',price,'version',version) from public.direz_settings where id=1;
$$;

create function public.direz_place_order(p_key uuid,p_data jsonb,p_attachments jsonb,p_expected_price integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.direz_settings; o public.direz_orders; k text; f jsonb; bytes bytea;
begin
 if p_key is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>20000 then raise exception 'Data pesanan tidak valid.'; end if;
 if p_attachments is null or jsonb_typeof(p_attachments)<>'array' then raise exception 'Lampiran tidak valid.'; end if;
 if jsonb_array_length(p_attachments)>4 or octet_length(p_attachments::text)>5700000 then raise exception 'Maksimal 4 lampiran, masing-masing 1 MB.'; end if;
 foreach k in array array['name','class','attendance','whatsapp','sd','smp','school','html','javascript','python','java','theme','style','color','reference'] loop
  if not (p_data ? k) or jsonb_typeof(p_data->k)<>'string' or length(btrim(p_data->>k))=0 or length(p_data->>k)>500 then raise exception 'Isian wajib belum lengkap atau terlalu panjang: %',k; end if;
 end loop;
 foreach k in array array['features','pages','notes'] loop
  if p_data ? k and (jsonb_typeof(p_data->k)<>'string' or length(p_data->>k)>2000) then raise exception 'Request terlalu panjang.'; end if;
 end loop;
 foreach k in array array['html','javascript','python','java'] loop
  if (p_data->>k)!~'^[0-9]{1,3}$' then raise exception 'Persentase harus bilangan bulat 0–100.'; end if;
  if (p_data->>k)::integer>100 then raise exception 'Persentase harus 0–100.'; end if;
 end loop;
 if (p_data->>'attendance')!~'^[1-9][0-9]{0,2}$' then raise exception 'Absen harus 1–999.'; end if;
 if (p_data->>'whatsapp')!~'^(\+62|62|0)8[0-9]{8,11}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
 for f in select value from jsonb_array_elements(p_attachments) loop
  if jsonb_typeof(f)<>'object' or coalesce(f->>'type','') not in ('image/jpeg','image/png','image/webp','application/pdf') or coalesce(length(f->>'name'),0) not between 1 and 255 or coalesce(length(f->>'data'),0) not between 1 and 1398104 then raise exception 'Format lampiran tidak valid.'; end if;
  bytes := decode(f->>'data','base64');
  if octet_length(bytes)>1048576 then raise exception 'Lampiran melebihi 1 MB.'; end if;
  if (f->>'type'='image/png' and encode(substring(bytes from 1 for 8),'hex')<>'89504e470d0a1a0a') or (f->>'type'='image/jpeg' and encode(substring(bytes from 1 for 3),'hex')<>'ffd8ff') or (f->>'type'='application/pdf' and encode(substring(bytes from 1 for 5),'hex')<>'255044462d') or (f->>'type'='image/webp' and (encode(substring(bytes from 1 for 4),'hex')<>'52494646' or encode(substring(bytes from 9 for 4),'hex')<>'57454250')) then raise exception 'Isi lampiran tidak sesuai format.'; end if;
 end loop;
 -- Lock satu baris: pengurangan slot dan insert pesanan berada dalam transaksi yang sama.
 select * into s from public.direz_settings where id=1 for update;
 -- Retry setelah respons jaringan hilang tidak membuat pesanan ganda.
 select * into o from public.direz_orders where request_key=p_key;
 if found then return jsonb_build_object('id',o.id,'price',o.price); end if;
 if s.slots<1 then raise exception 'Maaf, slot sudah habis. Silakan tunggu batch berikutnya.'; end if;
 if p_expected_price is distinct from s.price then raise exception 'Harga diperbarui admin. Periksa harga terbaru lalu kirim ulang.'; end if;
 -- Batasi pemesanan berulang dari nomor sama dalam 10 menit.
 if exists(select 1 from public.direz_orders where regexp_replace(regexp_replace(data->>'whatsapp','^\+',''),'^0','62')=regexp_replace(regexp_replace(p_data->>'whatsapp','^\+',''),'^0','62') and created_at>now()-interval '10 minutes') then raise exception 'Nomor ini baru saja memesan. Tunggu 10 menit sebelum pesanan berikutnya.'; end if;
 insert into public.direz_orders(request_key,price,data,attachments) values(p_key,s.price,p_data,p_attachments) returning * into o;
 update public.direz_settings set slots=slots-1,version=version+1 where id=1;
 return jsonb_build_object('id',o.id,'price',o.price);
end; $$;

create function public.direz_update_settings(p_slots integer,p_price integer,p_version bigint) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.direz_admin_check();
 if p_slots is null or p_price is null or p_slots not between 0 and 999 or p_price not between 1000 and 10000000 or p_price%1000<>0 then raise exception 'Slot 0–999; harga kelipatan Rp1.000, maksimal Rp10.000.000.'; end if;
 update public.direz_settings set slots=p_slots,price=p_price,version=version+1 where id=1 and version=p_version;
 if not found then raise exception 'Slot telah berubah karena pesanan/pembaruan lain. Periksa angka terbaru lalu simpan lagi.'; end if;
 return public.direz_public_settings();
end; $$;

create function public.direz_list_orders(p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.direz_admin_check();
 select coalesce(jsonb_agg(t),'[]'::jsonb) into result from (select id,created_at,price,status,data->>'name' as name from public.direz_orders order by created_at desc,id desc limit 25 offset greatest(0,coalesce(p_offset,0)))t;
 return result;
end; $$;
create function public.direz_order_detail(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.direz_admin_check();
 select jsonb_build_object('id',id,'created_at',created_at,'price',price,'status',status,'data',data,'attachments',attachments) into result from public.direz_orders where id=p_id;
 if result is null then raise exception 'Pesanan tidak ditemukan.'; end if;
 return result;
end; $$;
create function public.direz_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.direz_admin_check();
 if p_status is null or p_status not in ('Baru','Terkonfirmasi','Selesai') then raise exception 'Status tidak valid.'; end if;
 update public.direz_orders set status=p_status where id=p_id;
 if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
end; $$;

revoke all on function public.direz_admin_check(), public.direz_public_settings(), public.direz_place_order(uuid,jsonb,jsonb,integer), public.direz_update_settings(integer,integer,bigint), public.direz_list_orders(integer), public.direz_order_detail(uuid), public.direz_order_status(uuid,text) from public,anon,authenticated;
grant execute on function public.direz_public_settings(), public.direz_place_order(uuid,jsonb,jsonb,integer) to anon, authenticated;
grant execute on function public.direz_admin_check(), public.direz_update_settings(integer,integer,bigint), public.direz_list_orders(integer), public.direz_order_detail(uuid), public.direz_order_status(uuid,text) to authenticated;
commit;
