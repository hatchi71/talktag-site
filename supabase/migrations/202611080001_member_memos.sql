begin;
create table if not exists public.talktag_member_memos (
 user_id uuid primary key references auth.users(id) on delete cascade,
 memo text not null default '' check(length(memo)<=10000),
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.talktag_member_memos enable row level security;
revoke all on public.talktag_member_memos from public,anon,authenticated;
create or replace function public.talktag_admin_get_member_memo(p_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path='' as $$
begin
 if not public.talktag_device_session_allowed() or not exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Member not found';end if;
 return coalesce((select jsonb_build_object('memo',memo,'revision',revision,'updated_at',updated_at) from public.talktag_member_memos where user_id=p_user_id),jsonb_build_object('memo','','revision',0,'updated_at',null));
end;$$;
create or replace function public.talktag_admin_save_member_memo(p_user_id uuid,p_memo text,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_revision integer;v_time timestamptz;
begin
 if not public.talktag_device_session_allowed() or not exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_memo is null or length(p_memo)>10000 or p_revision is null or p_revision<0 then raise exception 'Invalid memo';end if;
 if p_revision=0 then
  insert into public.talktag_member_memos(user_id,memo,updated_by) values(p_user_id,p_memo,auth.uid()) on conflict(user_id) do nothing returning revision,updated_at into v_revision,v_time;
 else
  update public.talktag_member_memos set memo=p_memo,revision=revision+1,updated_at=now(),updated_by=auth.uid() where user_id=p_user_id and revision=p_revision returning revision,updated_at into v_revision,v_time;
 end if;
 if v_revision is null then raise exception 'Memo changed elsewhere. Reload before saving.' using errcode='40001';end if;
 insert into public.talktag_admin_audit(actor_user_id,target_user_id,action,details) values(auth.uid(),p_user_id,'update_member_memo',jsonb_build_object('revision',v_revision));
 return jsonb_build_object('memo',p_memo,'revision',v_revision,'updated_at',v_time);
end;$$;
revoke all on function public.talktag_admin_get_member_memo(uuid),public.talktag_admin_save_member_memo(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.talktag_admin_get_member_memo(uuid),public.talktag_admin_save_member_memo(uuid,text,integer) to authenticated;
commit;
