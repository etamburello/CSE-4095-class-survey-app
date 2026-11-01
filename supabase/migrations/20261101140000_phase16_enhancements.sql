-- Phase 16: new question types, org tables, multi-instructor, Realtime, RPC update.

-- ---------------------------------------------------------------------------
-- Org / instructor tables
-- ---------------------------------------------------------------------------

create table instructors (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    display_name text,
    created_at timestamptz not null default now()
);

create table courses (
    id uuid primary key default gen_random_uuid(),
    instructor_id uuid not null references instructors(id) on delete cascade,
    code text not null,
    name text not null,
    created_at timestamptz not null default now(),
    unique (instructor_id, code)
);

create index courses_instructor_id_idx on courses(instructor_id);

create table semesters (
    id uuid primary key default gen_random_uuid(),
    instructor_id uuid not null references instructors(id) on delete cascade,
    name text not null,
    starts_on date,
    ends_on date,
    created_at timestamptz not null default now(),
    unique (instructor_id, name)
);

create index semesters_instructor_id_idx on semesters(instructor_id);

create table question_bank (
    id uuid primary key default gen_random_uuid(),
    instructor_id uuid not null references instructors(id) on delete cascade,
    question_text text not null,
    question_type text not null
        check (question_type in (
            'multiple_choice',
            'true_false',
            'short_answer',
            'checkbox',
            'rating_scale',
            'numeric'
        )),
    choices jsonb not null default '[]'::jsonb,
    min_value numeric,
    max_value numeric,
    rating_max integer default 5,
    created_at timestamptz not null default now()
);

create index question_bank_instructor_id_idx on question_bank(instructor_id);

alter table surveys
    add column if not exists owner_id uuid references instructors(id) on delete set null,
    add column if not exists course_id uuid references courses(id) on delete set null,
    add column if not exists semester_id uuid references semesters(id) on delete set null,
    add column if not exists lms_course_url text;

create index surveys_owner_id_idx on surveys(owner_id);
create index surveys_course_id_idx on surveys(course_id);
create index surveys_semester_id_idx on surveys(semester_id);

create table survey_instructors (
    survey_id uuid not null references surveys(id) on delete cascade,
    instructor_id uuid not null references instructors(id) on delete cascade,
    role text not null default 'editor'
        check (role in ('owner', 'editor')),
    created_at timestamptz not null default now(),
    primary key (survey_id, instructor_id)
);

create index survey_instructors_instructor_id_idx
on survey_instructors(instructor_id);

-- ---------------------------------------------------------------------------
-- Question type expansion
-- ---------------------------------------------------------------------------

alter table questions drop constraint if exists questions_question_type_check;

alter table questions
    add constraint questions_question_type_check
    check (question_type in (
        'multiple_choice',
        'true_false',
        'short_answer',
        'checkbox',
        'rating_scale',
        'numeric'
    ));

alter table questions
    add column if not exists min_value numeric,
    add column if not exists max_value numeric,
    add column if not exists rating_max integer default 5;

alter table answers
    add column if not exists numeric_value numeric;

alter table answers drop constraint if exists answers_response_id_question_id_key;

-- Checkbox answers: multiple rows per (response, question) with distinct choice_id.
-- Single-choice / text / numeric: one row (choice_id may be null).
create unique index answers_single_per_question_idx
on answers (response_id, question_id)
where choice_id is null;

create unique index answers_choice_per_question_idx
on answers (response_id, question_id, choice_id)
where choice_id is not null;

-- ---------------------------------------------------------------------------
-- Instructors helper + ensure profile
-- ---------------------------------------------------------------------------

create or replace function ensure_instructor_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row instructors;
    v_email text;
begin
    if auth.uid() is null then
        raise exception 'NOT_AUTHENTICATED';
    end if;

    select email into v_email from auth.users where id = auth.uid();
    if v_email is null then
        raise exception 'NOT_AUTHENTICATED';
    end if;

    insert into instructors (id, email, display_name)
    values (auth.uid(), v_email, split_part(v_email, '@', 1))
    on conflict (id) do update
        set email = excluded.email
    returning * into v_row;

    return jsonb_build_object(
        'id', v_row.id,
        'email', v_row.email,
        'display_name', v_row.display_name
    );
end;
$$;

revoke all on function ensure_instructor_profile() from public;
grant execute on function ensure_instructor_profile() to authenticated;

create or replace function can_manage_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from surveys s
        where s.id = p_survey_id
          and (
              s.owner_id is null
              or s.owner_id = auth.uid()
              or exists (
                  select 1 from survey_instructors si
                  where si.survey_id = s.id
                    and si.instructor_id = auth.uid()
              )
          )
    );
$$;

-- ---------------------------------------------------------------------------
-- Updated submit_survey_response
-- Accepts: { question_id, choice_id? } | { question_id, choice_ids? } |
--          { question_id, text_answer? } | { question_id, numeric_value? }
-- ---------------------------------------------------------------------------

create or replace function submit_survey_response(
    p_survey_id uuid,
    p_anonymous_token text,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_response_id uuid;
    v_answer jsonb;
    v_question_id uuid;
    v_choice_id uuid;
    v_choice_ids uuid[];
    v_text text;
    v_numeric numeric;
    v_qtype text;
    v_min numeric;
    v_max numeric;
    v_seen uuid[] := '{}';
    v_elem uuid;
begin
    if p_anonymous_token is null or length(btrim(p_anonymous_token)) = 0 then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    select status into v_status
    from surveys
    where id = p_survey_id
    for update;

    if v_status is distinct from 'active' then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;

    if exists (
        select 1
        from responses
        where survey_id = p_survey_id
          and anonymous_token = p_anonymous_token
    ) then
        raise exception 'DUPLICATE_RESPONSE';
    end if;

    for v_answer in
        select value from jsonb_array_elements(p_answers)
    loop
        begin
            v_question_id := (v_answer->>'question_id')::uuid;
        exception
            when invalid_text_representation then
                raise exception 'INVALID_QUESTION';
        end;

        if v_question_id is null then
            raise exception 'MISSING_REQUIRED_ANSWER';
        end if;

        if v_question_id = any(v_seen) then
            raise exception 'INVALID_QUESTION';
        end if;
        v_seen := array_append(v_seen, v_question_id);

        select question_type, min_value, max_value
        into v_qtype, v_min, v_max
        from questions
        where id = v_question_id
          and survey_id = p_survey_id;

        if v_qtype is null then
            raise exception 'INVALID_QUESTION';
        end if;

        if v_qtype in ('multiple_choice', 'true_false', 'rating_scale') then
            begin
                v_choice_id := (v_answer->>'choice_id')::uuid;
            exception
                when invalid_text_representation then
                    raise exception 'INVALID_CHOICE';
            end;
            if v_choice_id is null then
                raise exception 'MISSING_REQUIRED_ANSWER';
            end if;
            if not exists (
                select 1 from choices
                where id = v_choice_id and question_id = v_question_id
            ) then
                raise exception 'INVALID_CHOICE';
            end if;

        elsif v_qtype = 'checkbox' then
            if jsonb_typeof(v_answer->'choice_ids') = 'array' then
                begin
                    select coalesce(array_agg((value#>>'{}')::uuid), '{}')
                    into v_choice_ids
                    from jsonb_array_elements(v_answer->'choice_ids');
                exception
                    when invalid_text_representation then
                        raise exception 'INVALID_CHOICE';
                end;
            elsif v_answer ? 'choice_id' and v_answer->>'choice_id' is not null then
                begin
                    v_choice_ids := array[(v_answer->>'choice_id')::uuid];
                exception
                    when invalid_text_representation then
                        raise exception 'INVALID_CHOICE';
                end;
            else
                v_choice_ids := '{}';
            end if;
            if coalesce(array_length(v_choice_ids, 1), 0) = 0 then
                raise exception 'MISSING_REQUIRED_ANSWER';
            end if;
            foreach v_elem in array v_choice_ids
            loop
                if not exists (
                    select 1 from choices
                    where id = v_elem and question_id = v_question_id
                ) then
                    raise exception 'INVALID_CHOICE';
                end if;
            end loop;

        elsif v_qtype = 'short_answer' then
            v_text := nullif(btrim(coalesce(v_answer->>'text_answer', '')), '');
            if v_text is null then
                raise exception 'MISSING_REQUIRED_ANSWER';
            end if;

        elsif v_qtype = 'numeric' then
            begin
                v_numeric := (v_answer->>'numeric_value')::numeric;
            exception
                when invalid_text_representation then
                    raise exception 'INVALID_CHOICE';
            end;
            if v_numeric is null then
                raise exception 'MISSING_REQUIRED_ANSWER';
            end if;
            if v_min is not null and v_numeric < v_min then
                raise exception 'INVALID_CHOICE';
            end if;
            if v_max is not null and v_numeric > v_max then
                raise exception 'INVALID_CHOICE';
            end if;
        else
            raise exception 'INVALID_QUESTION';
        end if;
    end loop;

    if (
        select count(*)
        from questions
        where survey_id = p_survey_id
    ) <> coalesce(array_length(v_seen, 1), 0) then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    insert into responses (survey_id, anonymous_token)
    values (p_survey_id, p_anonymous_token)
    returning id into v_response_id;

    for v_answer in
        select value from jsonb_array_elements(p_answers)
    loop
        v_question_id := (v_answer->>'question_id')::uuid;
        select question_type into v_qtype
        from questions where id = v_question_id;

        if v_qtype in ('multiple_choice', 'true_false', 'rating_scale') then
            insert into answers (response_id, question_id, choice_id)
            values (v_response_id, v_question_id, (v_answer->>'choice_id')::uuid);

        elsif v_qtype = 'checkbox' then
            if jsonb_typeof(v_answer->'choice_ids') = 'array' then
                insert into answers (response_id, question_id, choice_id)
                select v_response_id, v_question_id, (value#>>'{}')::uuid
                from jsonb_array_elements(v_answer->'choice_ids');
            else
                insert into answers (response_id, question_id, choice_id)
                values (v_response_id, v_question_id, (v_answer->>'choice_id')::uuid);
            end if;

        elsif v_qtype = 'short_answer' then
            insert into answers (response_id, question_id, text_answer)
            values (
                v_response_id,
                v_question_id,
                nullif(btrim(coalesce(v_answer->>'text_answer', '')), '')
            );

        elsif v_qtype = 'numeric' then
            insert into answers (response_id, question_id, numeric_value, text_answer)
            values (
                v_response_id,
                v_question_id,
                (v_answer->>'numeric_value')::numeric,
                v_answer->>'numeric_value'
            );
        end if;
    end loop;

    return jsonb_build_object(
        'success', true,
        'response_id', v_response_id
    );
exception
    when unique_violation then
        raise exception 'DUPLICATE_RESPONSE';
end;
$$;

revoke all on function submit_survey_response(uuid, text, jsonb) from public;
grant execute on function submit_survey_response(uuid, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS for new tables (authenticated instructors)
-- ---------------------------------------------------------------------------

alter table instructors enable row level security;
alter table courses enable row level security;
alter table semesters enable row level security;
alter table question_bank enable row level security;
alter table survey_instructors enable row level security;

create policy "instructors read profiles"
on instructors for select to authenticated
using (true);

create policy "instructors upsert own profile"
on instructors for insert to authenticated
with check (id = auth.uid());

create policy "instructors update own profile"
on instructors for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "instructors manage own courses"
on courses for all to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create policy "instructors manage own semesters"
on semesters for all to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create policy "instructors manage own question bank"
on question_bank for all to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create policy "instructors manage survey collaborators"
on survey_instructors for all to authenticated
using (can_manage_survey(survey_id))
with check (can_manage_survey(survey_id));

grant select, insert, update, delete
on instructors, courses, semesters, question_bank, survey_instructors
to authenticated;

grant select on instructors to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table responses;
exception
  when duplicate_object then null;
end $$;
