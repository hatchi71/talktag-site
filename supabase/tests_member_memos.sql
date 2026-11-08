begin;
do $$declare a uuid;s uuid;t uuid;r jsonb;rev integer;begin
 select u.id,x.id into a,s from auth.users u join public.staff_roles r on r.user_id=u.id and r.role='admin' join auth.sessions x on x.user_id=u.id limit 1;
 select id into t from auth.users where id<>a limit 1;
 if a is null or t is null then raise exception 'Test needs existing administrator session and another member';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',s)::text,true);
 r:=public.talktag_admin_get_member_memo(a);rev:=(r->>'revision')::integer;
 r:=public.talktag_admin_save_member_memo(a,'Temporary memo verification',rev);
 if public.talktag_admin_get_member_memo(a)->>'memo'<>'Temporary memo verification' then raise exception 'Persistence failed';end if;
 if public.talktag_admin_get_member_memo(t)->>'memo'='Temporary memo verification' then raise exception 'Member isolation failed';end if;
 begin perform public.talktag_admin_save_member_memo(a,'Stale edit',rev);raise exception 'Conflict check failed';exception when serialization_failure then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',t,'role','authenticated','session_id',s)::text,true);
 begin perform public.talktag_admin_get_member_memo(a);raise exception 'Non-admin read allowed';exception when insufficient_privilege then null;end;
 begin perform public.talktag_admin_save_member_memo(a,'Forbidden',0);raise exception 'Non-admin write allowed';exception when insufficient_privilege then null;end;
 if has_table_privilege('authenticated','public.talktag_member_memos','SELECT') or has_function_privilege('anon','public.talktag_admin_get_member_memo(uuid)','EXECUTE') then raise exception 'Unexpected public access';end if;
end;$$;
rollback;
select 'PASS: save/load, member isolation, stale-edit protection, non-admin rejection; all test changes rolled back' result;
