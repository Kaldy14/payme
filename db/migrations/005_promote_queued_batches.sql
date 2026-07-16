update app_batch
set status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
where status = 'active'
  and quantity_remaining = 0;

with next_queued_batch as (
  select distinct on (queued.shelf_id)
    queued.id
  from app_batch queued
  where queued.status = 'queued'
    and not exists (
      select 1
      from app_batch active
      where active.shelf_id = queued.shelf_id
        and active.status = 'active'
    )
  order by queued.shelf_id, queued.created_at asc, queued.id asc
)
update app_batch batch
set status = 'active',
    activated_at = now(),
    closed_at = null,
    updated_at = now()
from next_queued_batch
where batch.id = next_queued_batch.id;
