-- Preserve legacy ciphertext even if its original export key is unavailable.
alter table store_private.codes add column legacy_ciphertext text;
