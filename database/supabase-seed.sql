INSERT INTO "brands" ("name", "description", "note", "points_cost", "is_active")
SELECT 'Cafe Coffee Day', 'Partner reward voucher', 'Show voucher at counter', 250, true
WHERE NOT EXISTS (SELECT 1 FROM "brands" WHERE "name" = 'Cafe Coffee Day');

INSERT INTO "brands" ("name", "description", "note", "points_cost", "is_active")
SELECT 'Hamleys', 'Partner reward voucher', 'Valid at participating outlet', 500, true
WHERE NOT EXISTS (SELECT 1 FROM "brands" WHERE "name" = 'Hamleys');

INSERT INTO "notifications" ("message", "type")
SELECT 'Welcome to Konnectly Kids!', 'announcement'
WHERE NOT EXISTS (SELECT 1 FROM "notifications" LIMIT 1);
