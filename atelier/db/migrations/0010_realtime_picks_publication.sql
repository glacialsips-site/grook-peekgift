ALTER PUBLICATION supabase_realtime ADD TABLE peek_v2.picks;
ALTER TABLE peek_v2.picks REPLICA IDENTITY FULL;
