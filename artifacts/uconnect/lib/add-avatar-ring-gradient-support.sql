-- Enable gradient Aura Ring values in profiles.avatar_ring_color.
-- Format examples:
--   Solid legacy color: #6366F1
--   Gradient color:     gradient:#6366F1,#8B5CF6,#EC4899

alter table profiles
  alter column avatar_ring_color set default 'gradient:#6366F1,#8B5CF6,#EC4899';

update profiles
set avatar_ring_color = 'gradient:#6366F1,#8B5CF6,#EC4899'
where avatar_ring_color is null
   or btrim(avatar_ring_color) = '';

alter table profiles
  drop constraint if exists profiles_avatar_ring_color_format_check;

alter table profiles
  add constraint profiles_avatar_ring_color_format_check
  check (
    avatar_ring_color ~* '^#[0-9a-f]{3}([0-9a-f]{3})?$'
    or avatar_ring_color ~* '^gradient:#[0-9a-f]{3}([0-9a-f]{3})?(,#[0-9a-f]{3}([0-9a-f]{3})?){1,3}$'
  );

comment on column profiles.avatar_ring_color is
  'Aura Ring style. Supports legacy HEX (#6366F1) or gradient:<hex>,<hex>[,<hex>...] values.';
