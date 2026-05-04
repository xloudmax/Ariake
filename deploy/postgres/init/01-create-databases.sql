-- =============================================================================
-- deploy/postgres/init/01-create-databases.sql
-- Bootstraps the two-database layout for the dev compose stack.
-- Mounted by docker-compose.yml at /docker-entrypoint-initdb.d/.
-- The pgvector image executes anything under that path during first container
-- startup (when $POSTGRES_DB is empty). On subsequent starts it is ignored.
-- =============================================================================
--
-- Compose passes:
--   POSTGRES_USER     (default: blog)        — superuser for the cluster
--   POSTGRES_PASSWORD (default: changeme)
--   POSTGRES_DB       (default: blog)        — auto-created by the entrypoint
-- We additionally need:
--   - a separate `blog_graph` database
--   - a separate `blog_graph` role with its own password
--   - the pgvector extension in `blog_graph`
-- The graph role's password is read from $POSTGRES_GRAPH_PASSWORD via psql -v.
-- For dev the same password as the main role is acceptable; production should
-- NOT use this init script — provision PG manually per deploy/POSTGRES_SETUP.md.
--
-- =============================================================================

-- POSTGRES_USER + POSTGRES_DB are already created by the entrypoint.
-- We only add the graph role + db.

CREATE ROLE blog_graph WITH LOGIN PASSWORD 'blog_graph_dev_password';

CREATE DATABASE blog_graph OWNER blog_graph
    ENCODING 'UTF8' TEMPLATE template0;

GRANT CONNECT ON DATABASE blog_graph TO blog_graph;

\connect blog_graph

CREATE EXTENSION IF NOT EXISTS vector;

-- The blog_graph role created the DB so it owns the public schema. Just
-- double-check privileges are sane.
GRANT ALL ON SCHEMA public TO blog_graph;
