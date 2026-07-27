create table if not exists listings (
  id          text primary key,
  source      text not null,
  title       text,
  price       integer,
  rooms       numeric,
  location    text,
  url         text,
  raw         jsonb,                 
  sent_at     timestamptz default now()
);

create index if not exists listings_source_idx on listings (source);
create index if not exists listings_sent_at_idx on listings (sent_at desc);
