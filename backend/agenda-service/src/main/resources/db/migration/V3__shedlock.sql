-- Verrou ShedLock : la tâche des rappels ne tourne que sur une instance à la fois.
create table shedlock (
    name       varchar(64)  not null primary key,
    lock_until timestamptz  not null,
    locked_at  timestamptz  not null,
    locked_by  varchar(255) not null
);
