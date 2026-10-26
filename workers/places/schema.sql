-- The places and passbook database.
--
-- Two jobs in one database:
--
--   1. The administrative directory the Khata picker walks: State, district,
--      block and every village name in the Local Government Directory. Village
--      names sit as one JSON array per block, because a district can hold a
--      thousand villages and one row per block keeps the seed to a few thousand
--      writes instead of six hundred thousand.
--
--   2. The Gram Panchayat passbook rows that have actually been captured,
--      each with the public eGramSwaraj payload and its hash. A GP is attached
--      to a village, so choosing a village in the picker either opens a
--      passbook or says plainly that none has been captured yet.
--
-- Run with:
--   wrangler d1 execute ths-places --remote --file=workers/places/schema.sql

DROP TABLE IF EXISTS passbooks;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS states;
DROP TABLE IF EXISTS meta;

CREATE TABLE states (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

CREATE TABLE districts (
  id INTEGER PRIMARY KEY,
  state_id INTEGER NOT NULL,
  name TEXT NOT NULL
);

CREATE INDEX districts_state ON districts(state_id);

CREATE TABLE blocks (
  id INTEGER PRIMARY KEY,
  district_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  villages TEXT NOT NULL
);

CREATE INDEX blocks_district ON blocks(district_id);

CREATE TABLE passbooks (
  code INTEGER PRIMARY KEY,
  state_id INTEGER NOT NULL,
  district_id INTEGER NOT NULL,
  block_id INTEGER NOT NULL,
  village TEXT NOT NULL,
  name TEXT NOT NULL,
  name_hi TEXT,
  payload TEXT NOT NULL,
  data_hash TEXT,
  generated_at TEXT
);

CREATE INDEX passbooks_district ON passbooks(district_id);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
