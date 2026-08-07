/*
# Create get_table_row_counts function for admin analytics

Returns row counts for all public tables. Used by the admin database
management page to display table statistics.
*/

CREATE OR REPLACE FUNCTION get_table_row_counts()
RETURNS TABLE(table_name text, row_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text AS table_name,
    c.reltuples::bigint AS row_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
