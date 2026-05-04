-- 启用模糊匹配扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 为知识节点添加全文检索向量字段
ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 创建自动更新全文索引的函数
CREATE OR REPLACE FUNCTION nodes_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS tsvectorupdate ON knowledge_nodes;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON knowledge_nodes FOR EACH ROW EXECUTE FUNCTION nodes_tsvector_trigger();

-- 手动刷新现有数据的索引
UPDATE knowledge_nodes SET name = name;

-- 创建全文检索索引 (GIN)
CREATE INDEX IF NOT EXISTS idx_nodes_search_vector ON knowledge_nodes USING GIN(search_vector);

-- 验证是否工作
SELECT name, ts_rank(search_vector, plainto_tsquery('simple', 'React')) as rank 
FROM knowledge_nodes 
WHERE name ILIKE '%React%';
