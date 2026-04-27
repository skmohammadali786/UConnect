-- End-to-end encryption support for chat messages

alter table public.profiles
  add column if not exists chat_public_key text;

alter table public.messages
  add column if not exists encrypted_content text,
  add column if not exists encryption_iv text,
  add column if not exists sender_public_key text,
  add column if not exists encryption_version int not null default 1;

-- Keep legacy plaintext content as fallback for old clients/messages.
-- New encrypted clients should store:
-- - content = generic placeholder like '🔒 Encrypted message'
-- - encrypted_content + encryption_iv + sender_public_key + encryption_version
