-- Classroom Survey schema, relationships, and access policies.
-- Students can read an active survey and submit through submit_survey_response.
-- They cannot read responses or answers. Authenticated instructors can manage every table.

create table surveys (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    status text not null default 'draft'
        check (status in ('draft', 'active', 'closed', 'archived')),
    public_slug text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index surveys_status_idx on surveys(status);

create unique index only_one_active_survey
on surveys ((status))
where status = 'active';

create table questions (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    question_text text not null,
    question_type text not null
        check (question_type in ('multiple_choice', 'true_false')),
    position integer not null,
    created_at timestamptz not null default now()
);

create index questions_survey_id_idx on questions(survey_id);

create table choices (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references questions(id) on delete cascade,
    choice_text text not null,
    position integer not null,
    created_at timestamptz not null default now()
);

create index choices_question_id_idx on choices(question_id);

create table responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    anonymous_token text,
    submitted_at timestamptz not null default now()
);

create index responses_survey_id_idx on responses(survey_id);

create index responses_submitted_at_idx on responses(submitted_at);

create unique index responses_unique_student_per_survey
on responses(survey_id, anonymous_token)
where anonymous_token is not null;

create table answers (
    id uuid primary key default gen_random_uuid(),
    response_id uuid not null references responses(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    choice_id uuid references choices(id) on delete set null,
    text_answer text,
    created_at timestamptz not null default now(),
    unique(response_id, question_id)
);

create index answers_response_id_idx on answers(response_id);

create index answers_question_id_idx on answers(question_id);

create index answers_choice_id_idx on answers(choice_id);

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger surveys_updated_at
before update on surveys
for each row
execute function update_updated_at_column();

-- Atomic student submission. Anonymous users call this function.
-- They do not receive direct insert access to responses or answers.
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
    v_seen uuid[] := '{}';
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
            v_choice_id := (v_answer->>'choice_id')::uuid;
        exception
            when invalid_text_representation then
                raise exception 'INVALID_QUESTION';
        end;

        if v_question_id is null or v_choice_id is null then
            raise exception 'MISSING_REQUIRED_ANSWER';
        end if;

        if v_question_id = any(v_seen) then
            raise exception 'INVALID_QUESTION';
        end if;
        v_seen := array_append(v_seen, v_question_id);

        if not exists (
            select 1
            from questions
            where id = v_question_id
              and survey_id = p_survey_id
        ) then
            raise exception 'INVALID_QUESTION';
        end if;

        if not exists (
            select 1
            from choices
            where id = v_choice_id
              and question_id = v_question_id
        ) then
            raise exception 'INVALID_CHOICE';
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

    insert into answers (response_id, question_id, choice_id)
    select
        v_response_id,
        (value->>'question_id')::uuid,
        (value->>'choice_id')::uuid
    from jsonb_array_elements(p_answers);

    return jsonb_build_object(
        'success', true,
        'response_id', v_response_id
    );
exception
    when unique_violation then
        raise exception 'DUPLICATE_RESPONSE';
end;
$$;

alter table surveys enable row level security;
alter table questions enable row level security;
alter table choices enable row level security;
alter table responses enable row level security;
alter table answers enable row level security;

create policy "students read active surveys"
on surveys
for select
to anon
using (status = 'active');

create policy "students read active survey questions"
on questions
for select
to anon
using (
    exists (
        select 1
        from surveys
        where surveys.id = questions.survey_id
          and surveys.status = 'active'
    )
);

create policy "students read active survey choices"
on choices
for select
to anon
using (
    exists (
        select 1
        from questions
        join surveys on surveys.id = questions.survey_id
        where questions.id = choices.question_id
          and surveys.status = 'active'
    )
);

create policy "authenticated users manage surveys"
on surveys
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage questions"
on questions
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage choices"
on choices
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage responses"
on responses
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage answers"
on answers
for all
to authenticated
using (true)
with check (true);

grant select on surveys, questions, choices to anon;
revoke all on responses, answers from anon;

grant select, insert, update, delete
on surveys, questions, choices, responses, answers
to authenticated;

revoke all on function submit_survey_response(uuid, text, jsonb) from public;
grant execute on function submit_survey_response(uuid, text, jsonb) to anon, authenticated;
