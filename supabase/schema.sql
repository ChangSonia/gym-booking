-- ═══════════════════════════════════════════════════════════
--  健身房團課報名系統 — 資料庫 Schema
--  在 Supabase 的 SQL Editor 貼上執行
-- ═══════════════════════════════════════════════════════════

-- ── 使用者 ──────────────────────────────────────────────
create table users (
  id            bigserial primary key,
  line_user_id  text unique not null,        -- LINE 給的 ID，只有本人登入過才拿得到
  display_name  text,
  picture_url   text,
  is_coach      boolean not null default false,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
comment on column users.is_coach is '教練：能管理課程、看名單、幫人報名';
comment on column users.is_admin is '管理員：能設定誰是教練。第一個要手動設';

create index on users (is_coach) where is_coach;


-- ── 教練 ────────────────────────────────────────────────
-- 教練名字是「顯示用的字串」，不一定對應到 users
-- 理由：教練可能還沒登入過系統，但課表上要先掛他的名字
create table coaches (
  id          bigserial primary key,
  name        text unique not null,          -- 所見即所得，不做簡稱
  user_id     bigint references users(id),   -- 之後綁定，可為 null
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table coaches is '名字所見即所得。刪除教練時，名下課程的 coach 設為 NULL，UI 顯示「待定」';


-- ── 每週固定課程（模板）────────────────────────────────
create table courses (
  id          bigserial primary key,
  title       text not null,
  coach_id    bigint references coaches(id) on delete set null,  -- NULL = 待定
  weekday     smallint not null check (weekday between 1 and 7), -- 1=一 ... 7=日
  start_time  time not null,
  capacity    int not null check (capacity > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table courses is '模板。改這裡只影響「生效日之後、且還沒開放報名」的 sessions';
comment on column courses.active is 'false = 停用，未來不再排課，但已排出的照常上';

create index on courses (weekday, start_time) where active;


-- ── 單次課程 ────────────────────────────────────────────
create table sessions (
  id          bigserial primary key,
  course_id   bigint references courses(id) on delete set null,  -- 加開課為 NULL
  title       text not null,                 -- 從模板複製，可個別覆寫
  coach_id    bigint references coaches(id) on delete set null,
  starts_at   timestamptz not null,
  capacity    int not null check (capacity > 0),
  open_at     timestamptz not null,          -- 開放報名時間
  is_extra    boolean not null default false,-- 加開課
  status      text not null default 'scheduled'
              check (status in ('scheduled','cancelled')),
  archived    boolean not null default false,-- 過期歸檔，不刪
  reminder_sent boolean not null default false, -- 課前一天提醒發過了沒，避免重複發
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on column sessions.archived is '過期歸檔。不刪資料，保留 no-show 統計的依據';
comment on column sessions.course_id is 'NULL = 加開課或模板已刪。模板刪掉時已排出的課要保留';

create index on sessions (starts_at) where not archived and status = 'scheduled';
create index on sessions (course_id);
create index on sessions (open_at);


-- ── 報名 ────────────────────────────────────────────────
create table bookings (
  id            bigserial primary key,
  session_id    bigint not null references sessions(id) on delete cascade,
  user_id       bigint not null references users(id),
  qty           int not null default 1 check (qty between 1 and 4),
  status        text not null
                check (status in ('confirmed','waitlisted','cancelled','session_cancelled')),
  wl_position      int,                          -- 候補順位，confirmed 時為 NULL
  prev_status   text,                         -- 停課前的狀態
  prev_position int,                          -- 停課前的順位
  booked_by     bigint references users(id),  -- 教練代報時記錄是誰報的
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column bookings.qty is '一筆 = 一組人。整組成立或整組候補，不拆單';
comment on column bookings.wl_position is
  '候補順位。欄位不叫 position 是因為那是 PostgreSQL 保留字，在 RETURNS TABLE 裡會語法錯誤';
comment on column bookings.status is
  'confirmed=已報名 / waitlisted=候補 / cancelled=會員自己取消 / session_cancelled=停課退掉的';
comment on column bookings.prev_status is
  '停課時存快照。恢復課程時原樣放回，順位不變。會員自己取消的不會被救回來';
comment on column bookings.booked_by is '教練幫會員報名時記錄操作者，稽核用';

-- 同一堂課、同一個人，只能有一筆「有效」報名
-- 部分索引：只管 confirmed / waitlisted，取消過的可以重報
create unique index bookings_one_live_per_user
  on bookings (session_id, user_id)
  where status in ('confirmed','waitlisted');

create index on bookings (session_id, status);
create index on bookings (user_id) where status in ('confirmed','waitlisted');


-- ── 系統設定 ────────────────────────────────────────────
-- 這些是「設定」不是「程式」。老闆要能自己改，不用找工程師
create table settings (
  key    text primary key,
  value  text not null,
  note   text
);

insert into settings (key, value, note) values
  ('open_days_before', '7',     '提前幾天開放報名'),
  ('open_time',        '12:00', '幾點開放報名'),
  ('max_qty',          '4',     '每筆報名最多幾人'),
  ('weeks_visible',    '2',     '會員端顯示未來幾週'),
  ('weeks_generate',   '3',     '排程器排出未來幾週'),
  ('archive_after_days','1',    '課程結束幾天後歸檔');


-- ── 稽核紀錄 ────────────────────────────────────────────
create table audit_log (
  id          bigserial primary key,
  actor_id    bigint references users(id),
  action      text not null,
  target      text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_log (created_at desc);


-- ═══════════════════════════════════════════════════════════
--  核心：報名（防超賣）
--  關鍵是 FOR UPDATE 行鎖。沒有它，12:00 那一秒 16 人的課會變 19 人
-- ═══════════════════════════════════════════════════════════
create or replace function book_session(
  p_session_id bigint,
  p_user_id    bigint,
  p_qty        int,
  p_booked_by  bigint default null
) returns table (out_status text, out_position int) as $$
declare
  v_session   sessions%rowtype;
  v_used      int;
  v_status    text;
  v_position  int;
begin
  -- 鎖住這一堂課，其他請求要排隊
  select * into v_session from sessions where id = p_session_id for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'SESSION_CANCELLED';
  end if;
  if now() < v_session.open_at then
    raise exception 'NOT_OPEN_YET';
  end if;
  if p_qty < 1 or p_qty > 4 then
    raise exception 'INVALID_QTY';
  end if;

  select coalesce(sum(b.qty),0) into v_used
    from bookings b where b.session_id = p_session_id and b.status = 'confirmed';

  -- 不拆單：塞得下就整組成立，塞不下就整組候補
  if p_qty <= v_session.capacity - v_used then
    v_status := 'confirmed';
    v_position := null;
  else
    v_status := 'waitlisted';
    select coalesce(max(b.wl_position),0) + 1 into v_position
      from bookings b where b.session_id = p_session_id and b.status = 'waitlisted';
  end if;

  insert into bookings (session_id, user_id, qty, status, wl_position, booked_by)
  values (p_session_id, p_user_id, p_qty, v_status, v_position, p_booked_by);

  return query select v_status, v_position;
exception
  when unique_violation then
    raise exception 'ALREADY_BOOKED';
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  遞補：嚴格 FIFO，塞不下就等，不跳號
--  這是營運政策，要改先問老闆
-- ═══════════════════════════════════════════════════════════
create or replace function promote_waitlist(p_session_id bigint)
returns setof bookings as $$
declare
  v_session  sessions%rowtype;
  v_used     int;
  v_next     bookings%rowtype;
begin
  select * into v_session from sessions where id = p_session_id for update;

  loop
    select coalesce(sum(b.qty),0) into v_used
      from bookings b where b.session_id = p_session_id and b.status = 'confirmed';

    select * into v_next from bookings b
      where b.session_id = p_session_id and b.status = 'waitlisted'
      order by b.wl_position limit 1;

    exit when not found;
    exit when v_next.qty > v_session.capacity - v_used;   -- 塞不下 → 停，不跳號

    -- 用 returning 抓更新後的最新狀態，不要回傳更新前的舊快照
    -- （v_next 是 update 之前 select 進來的，update 完不會自動跟著變）
    update bookings set status='confirmed', wl_position=null, updated_at=now()
      where id = v_next.id
      returning * into v_next;

    -- 重排剩下的順位
    with ranked as (
      select id, row_number() over (order by wl_position) as rn
        from bookings where session_id = p_session_id and status = 'waitlisted'
    )
    update bookings b set wl_position = r.rn from ranked r where b.id = r.id;

    return next v_next;
  end loop;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  取消（會員自己取消）→ 觸發遞補
-- ═══════════════════════════════════════════════════════════
create or replace function cancel_booking(p_booking_id bigint, p_actor_id bigint)
returns setof bookings as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  update bookings set status='cancelled', updated_at=now() where id = p_booking_id;

  -- 重排候補順位
  with ranked as (
    select id, row_number() over (order by wl_position) as rn
      from bookings where session_id = v_booking.session_id and status = 'waitlisted'
  )
  update bookings b set wl_position = r.rn from ranked r where b.id = r.id;

  if v_booking.status = 'confirmed' then
    return query select * from promote_waitlist(v_booking.session_id);
  end if;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  改報名/候補人數（會員自己編輯）
--  confirmed 改人數要重新檢查名額（跟 book_session 一樣鎖 session）；
--  減少人數可能空出名額，改完一律跑一次 promote_waitlist。
--  waitlisted 改人數不影響別人，不用檢查名額，但一樣跑 promote_waitlist
--  確保如果剛好排到他、名額又夠，直接遞補。
-- ═══════════════════════════════════════════════════════════
create or replace function edit_booking_qty(
  p_booking_id bigint,
  p_actor_id   bigint,
  p_qty        int
) returns setof bookings as $$
declare
  v_booking  bookings%rowtype;
  v_session  sessions%rowtype;
  v_used     int;
begin
  if p_qty < 1 or p_qty > 4 then
    raise exception 'INVALID_QTY';
  end if;

  select * into v_booking from bookings where id = p_booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status not in ('confirmed','waitlisted') then
    raise exception 'BOOKING_NOT_EDITABLE';
  end if;

  select * into v_session from sessions where id = v_booking.session_id for update;

  if v_booking.status = 'confirmed' then
    select coalesce(sum(b.qty),0) into v_used
      from bookings b
      where b.session_id = v_booking.session_id
        and b.status = 'confirmed'
        and b.id <> p_booking_id;

    if p_qty > v_session.capacity - v_used then
      raise exception 'NOT_ENOUGH_CAPACITY';
    end if;
  end if;

  update bookings set qty = p_qty, updated_at = now() where id = p_booking_id;

  return query select * from bookings where id = p_booking_id;
  return query select * from promote_waitlist(v_booking.session_id);
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  停課 / 恢復
--  關鍵：session_cancelled 和 cancelled 是不同的狀態
--  停課存快照，恢復時原樣放回。會員自己取消的不會被救回來
-- ═══════════════════════════════════════════════════════════
create or replace function cancel_session(p_session_id bigint)
returns int as $$
declare v_count int;
begin
  update sessions set status='cancelled', updated_at=now() where id = p_session_id;

  with hit as (
    update bookings
      set prev_status = status,
          prev_position = wl_position,
          status = 'session_cancelled',
          updated_at = now()
      where session_id = p_session_id and status in ('confirmed','waitlisted')
      returning 1
  ) select count(*) into v_count from hit;

  return v_count;
end;
$$ language plpgsql;

create or replace function restore_session(p_session_id bigint)
returns setof bookings as $$
begin
  update sessions set status='scheduled', updated_at=now() where id = p_session_id;

  return query
    update bookings
      set status = prev_status,
          wl_position = prev_position,
          prev_status = null,
          prev_position = null,
          updated_at = now()
      where session_id = p_session_id and status = 'session_cancelled'
      returning *;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  排程器：由模板排出未來 N 週
--  每天半夜跑一次（Vercel Cron / Supabase pg_cron）
-- ═══════════════════════════════════════════════════════════
create or replace function generate_sessions(p_weeks int default 3)
returns int as $$
declare
  v_course     courses%rowtype;
  v_date       date;
  v_starts     timestamptz;
  v_open_days  int;
  v_open_time  time;
  v_count      int := 0;
  v_monday     date;
begin
  select value::int  into v_open_days from settings where key='open_days_before';
  select value::time into v_open_time from settings where key='open_time';

  -- 台北時間的本週一
  v_monday := date_trunc('week', (now() at time zone 'Asia/Taipei')::date)::date;

  for v_course in select * from courses where active loop
    for i in 0..(p_weeks - 1) loop
      v_date := v_monday + (i * 7) + (v_course.weekday - 1);
      v_starts := (v_date + v_course.start_time) at time zone 'Asia/Taipei';

      -- 已存在就跳過
      if exists (select 1 from sessions
                 where course_id = v_course.id and starts_at = v_starts) then
        continue;
      end if;
      -- 過去的不排
      if v_starts < now() then continue; end if;

      insert into sessions (course_id, title, coach_id, starts_at, capacity, open_at)
      values (
        v_course.id, v_course.title, v_course.coach_id, v_starts, v_course.capacity,
        ((v_date - v_open_days) + v_open_time) at time zone 'Asia/Taipei'
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  歸檔：過期的課不顯示，但不刪
-- ═══════════════════════════════════════════════════════════
create or replace function archive_old_sessions()
returns int as $$
declare
  v_days  int;
  v_count int;
begin
  select value::int into v_days from settings where key='archive_after_days';

  with hit as (
    update sessions set archived = true, updated_at = now()
      where not archived and starts_at < now() - (v_days || ' days')::interval
      returning 1
  ) select count(*) into v_count from hit;

  return v_count;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  套用模板改動：只影響生效日之後、且還沒開放報名的
-- ═══════════════════════════════════════════════════════════
create or replace function apply_course_to_sessions(
  p_course_id bigint,
  p_from      date
) returns int as $$
declare
  v_course courses%rowtype;
  v_count  int;
begin
  select * into v_course from courses where id = p_course_id;

  with hit as (
    update sessions s
      set title     = v_course.title,
          coach_id  = v_course.coach_id,
          capacity  = v_course.capacity,
          starts_at = (((s.starts_at at time zone 'Asia/Taipei')::date
                        + v_course.start_time) at time zone 'Asia/Taipei'),
          updated_at = now()
      where s.course_id = p_course_id
        and (s.starts_at at time zone 'Asia/Taipei')::date >= p_from
        and s.open_at > now()              -- 已開放報名的凍結
        and s.status = 'scheduled'
        and not s.archived
      returning 1
  ) select count(*) into v_count from hit;

  return v_count;
end;
$$ language plpgsql;


-- ═══════════════════════════════════════════════════════════
--  Row Level Security
--  後端用 service_role key，會繞過 RLS。這是防止前端直連的保險
-- ═══════════════════════════════════════════════════════════
alter table users     enable row level security;
alter table bookings  enable row level security;
alter table sessions  enable row level security;
alter table courses   enable row level security;
alter table coaches   enable row level security;
alter table settings  enable row level security;
alter table audit_log enable row level security;

-- 預設全部拒絕。所有存取都經過後端（service_role）
-- 前端拿不到 service_role key，只能打我們的 API


-- ═══════════════════════════════════════════════════════════
--  種子資料：真實課表
--  ⚠️ capacity 是猜的，要跟老闆確認
-- ═══════════════════════════════════════════════════════════
insert into coaches (name) values
  ('Anisa'), ('宋教練'), ('Dumars教練'), ('Jay'),
  ('Noel'), ('雪兒老師'), ('Sandra'), ('阿酷教練');

insert into courses (title, coach_id, weekday, start_time, capacity)
select v.title, c.id, v.wd, v.t::time, v.cap
from (values
  ('基礎重訓', 'Anisa',       1, '11:00', 10),
  ('泰拳',     '宋教練',      1, '20:00', 16),
  ('早安TRX',  'Dumars教練',  2, '11:00', 10),
  ('晚安TRX',  'Jay',         2, '20:00', 10),
  ('滾筒放鬆', 'Jay',         2, '21:10', 12),
  ('基礎重訓', 'Noel',        3, '11:00', 10),
  ('泰拳團課', '宋教練',      3, '20:00', 16),
  ('皮拉提斯', '雪兒老師',    4, '11:00', 10),
  ('流動瑜珈', 'Sandra',      4, '19:00', 12),
  ('基礎重訓', 'Noel',        4, '19:10', 10),
  ('綜合雕塑', 'Anisa',       4, '20:10', 12),
  ('基礎重訓', 'Anisa',       5, '11:00', 10),
  ('泰拳',     '宋教練',      5, '20:00', 16),
  ('踢拳擊',   '阿酷教練',    6, '11:30', 14)
) as v(title, coach, wd, t, cap)
join coaches c on c.name = v.coach;

-- 排出未來三週
select generate_sessions(3);
