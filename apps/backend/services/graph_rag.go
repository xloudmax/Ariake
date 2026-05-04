package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"repair-platform/models"
	"sort"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrGraphRAGUnavailable = errors.New("graphrag unavailable")

type GraphRAGService struct {
	db        *gorm.DB
	aiService *AIService
}

type seedMatch struct {
	Score   float64
	Reasons []string
}

func NewGraphRAGService(db *gorm.DB, ai *AIService) *GraphRAGService {
	return &GraphRAGService{
		db:        db,
		aiService: ai,
	}
}

// GraphFullResult represents a sub-graph with nodes and edges.
type GraphFullResult struct {
	Nodes []models.GraphSearchResult `json:"nodes"`
	Edges []models.GraphEdge         `json:"edges"`
}

func (s *GraphRAGService) ensureLocalSearchAvailable() error {
	if s == nil || s.db == nil || s.db.Dialector == nil || s.db.Dialector.Name() != "postgres" {
		return ErrGraphRAGUnavailable
	}
	if s.aiService == nil {
		return ErrGraphRAGUnavailable
	}
	return nil
}

func (s *GraphRAGService) ensureAIServiceAvailable() error {
	if s == nil || s.aiService == nil {
		return ErrGraphRAGUnavailable
	}
	return nil
}

// LocalSearch performs a multi-hop graph retrieval and returns the full sub-graph.
func (s *GraphRAGService) LocalSearch(ctx context.Context, query string, maxHops int) (*GraphFullResult, error) {
	if err := s.ensureLocalSearchAvailable(); err != nil {
		return nil, err
	}

	// 1. Get query embedding
	embedding, err := s.aiService.GetEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get query embedding: %w", err)
	}

	vectorStr := "["
	for i, v := range embedding {
		if i > 0 {
			vectorStr += ","
		}
		vectorStr += fmt.Sprintf("%f", v)
	}
	vectorStr += "]"

	// 2. Perform Hybrid Search
	seedMatches, _ := s.getHybridSeeds(ctx, query, vectorStr, 10)
	seedIDs := make([]uuid.UUID, 0, len(seedMatches))
	for id := range seedMatches {
		seedIDs = append(seedIDs, id)
	}

	// 3. Prepare Recursive CTE
	var cteQuery string
	var queryArgs []any

	if len(seedIDs) > 0 {
		cteQuery = `
		WITH RECURSIVE graph_traversal AS (
			SELECT id, COALESCE(NULLIF(display_name, ''), name) as name, COALESCE(NULLIF(canonical_name, ''), name) as canonical_name, COALESCE(NULLIF(display_name, ''), name) as display_name, description, type, community_id, 0 as hop_level, ARRAY[id] as path
			FROM knowledge_nodes
			WHERE id IN ?
			UNION ALL
			SELECT n.id, COALESCE(NULLIF(n.display_name, ''), n.name), COALESCE(NULLIF(n.canonical_name, ''), n.name), COALESCE(NULLIF(n.display_name, ''), n.name), n.description, n.type, n.community_id, gt.hop_level + 1, gt.path || n.id
			FROM graph_traversal gt
			JOIN knowledge_edges e ON (gt.id = e.source_id OR gt.id = e.target_id) AND e.confidence >= 0.55
			JOIN knowledge_nodes n ON n.id = CASE WHEN gt.id = e.source_id THEN e.target_id ELSE e.source_id END
			WHERE gt.hop_level < ? AND NOT n.id = ANY(gt.path)

		)
		SELECT DISTINCT id, name, canonical_name, display_name, description, type, community_id, MIN(hop_level) as hop_level
		FROM graph_traversal
		GROUP BY id, name, canonical_name, display_name, description, type, community_id
		ORDER BY hop_level ASC
		LIMIT 100;`
		queryArgs = []any{seedIDs, maxHops}
	} else {

		cteQuery = `
		WITH RECURSIVE graph_traversal AS (
			SELECT id, COALESCE(NULLIF(display_name, ''), name) as name, COALESCE(NULLIF(canonical_name, ''), name) as canonical_name, COALESCE(NULLIF(display_name, ''), name) as display_name, description, type, community_id, 0 as hop_level, ARRAY[id] as path
			FROM knowledge_nodes
			ORDER BY embedding <=> ?::vector LIMIT 3
			UNION ALL
			SELECT n.id, COALESCE(NULLIF(n.display_name, ''), n.name), COALESCE(NULLIF(n.canonical_name, ''), n.name), COALESCE(NULLIF(n.display_name, ''), n.name), n.description, n.type, n.community_id, gt.hop_level + 1, gt.path || n.id
			FROM graph_traversal gt
			JOIN knowledge_edges e ON (gt.id = e.source_id OR gt.id = e.target_id) AND e.confidence >= 0.55
			JOIN knowledge_nodes n ON n.id = CASE WHEN gt.id = e.source_id THEN e.target_id ELSE e.source_id END
			WHERE gt.hop_level < ? AND NOT n.id = ANY(gt.path)

		)
		SELECT DISTINCT id, name, canonical_name, display_name, description, type, community_id, MIN(hop_level) as hop_level
		FROM graph_traversal
		GROUP BY id, name, canonical_name, display_name, description, type, community_id
		ORDER BY hop_level ASC
		LIMIT 100;`
		queryArgs = []any{vectorStr, maxHops}
	}

	var nodes []models.GraphSearchResult
	if err := s.db.WithContext(ctx).Raw(cteQuery, queryArgs...).Scan(&nodes).Error; err != nil {
		return nil, err
	}
	if len(nodes) > 0 {
		type nodeMetadataRow struct {
			ID       uuid.UUID `gorm:"column:id"`
			Metadata string    `gorm:"column:metadata"`
		}
		var metadataRows []nodeMetadataRow
		if err := s.db.WithContext(ctx).
			Raw("SELECT id, metadata::text AS metadata FROM knowledge_nodes WHERE id IN ?", nodeIDsFromResults(nodes)).
			Scan(&metadataRows).Error; err == nil {
			metadataByID := make(map[uuid.UUID]map[string]any, len(metadataRows))
			for _, row := range metadataRows {
				var parsed map[string]any
				if json.Unmarshal([]byte(row.Metadata), &parsed) == nil {
					metadataByID[row.ID] = parsed
				}
			}
			for i := range nodes {
				if parsed, ok := metadataByID[nodes[i].ID]; ok {
					nodes[i].Aliases = toStringSlice(parsed["aliases"])
					nodes[i].SourcePostIDs = toStringSlice(parsed["source_post_ids"])
				}
			}
		}
	}
	for i := range nodes {
		nodes[i].PathStrength = 1.0 / float64(nodes[i].HopLevel+1)
		if match, ok := seedMatches[nodes[i].ID]; ok {
			nodes[i].SeedScore = match.Score
			nodes[i].Score = match.Score + nodes[i].PathStrength
			nodes[i].MatchReasons = match.Reasons
		} else {
			nodes[i].Score = nodes[i].PathStrength
			nodes[i].MatchReasons = []string{"connected_via_high_confidence_edge"}
		}
	}

	// 4. Fetch all edges connecting these nodes to reconstruct the topology
	nodeIDs := make([]uuid.UUID, len(nodes))
	for i, n := range nodes {
		nodeIDs[i] = n.ID
	}

	var edges []models.GraphEdge
	if len(nodeIDs) > 0 {
		s.db.WithContext(ctx).
			Table("knowledge_edges").
			Where("source_id IN ? AND target_id IN ?", nodeIDs, nodeIDs).
			Find(&edges)
	}

	return &GraphFullResult{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func nodeIDsFromResults(nodes []models.GraphSearchResult) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(nodes))
	for _, node := range nodes {
		ids = append(ids, node.ID)
	}
	return ids
}

func toStringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok && text != "" {
			out = append(out, text)
		}
	}
	return out
}

// getHybridSeeds combines Vector similarity, Full-Text Search, and Fuzzy matching using Reciprocal Rank Fusion (RRF).
func (s *GraphRAGService) getHybridSeeds(ctx context.Context, query string, vectorStr string, topN int) (map[uuid.UUID]seedMatch, error) {
	const k = 60 // RRF constant

	// 1. Vector Search Ranking (Semantic Signal)
	var vectorNodes []uuid.UUID
	err := s.db.WithContext(ctx).Raw(`
		SELECT id FROM knowledge_nodes 
		ORDER BY embedding <=> ?::vector LIMIT ?`, vectorStr, topN).Scan(&vectorNodes).Error
	if err != nil {
		fmt.Printf("Vector search failed, falling back to text-only: %v\n", err)
	}

	// 2. FTS Search Ranking (Extreme Title Primacy - 5.0x)
	var ftsNodes []uuid.UUID
	err = s.db.WithContext(ctx).Raw(`
		SELECT id FROM knowledge_nodes 
		WHERE search_vector @@ websearch_to_tsquery('simple', ?)
		ORDER BY (
			ts_rank(setweight(to_tsvector('simple', name), 'A'), websearch_to_tsquery('simple', ?)) * 5.0 + 
			ts_rank(setweight(to_tsvector('simple', description), 'B'), websearch_to_tsquery('simple', ?))
		) DESC
		LIMIT ?`, query, query, query, topN).Scan(&ftsNodes).Error
	if err != nil {
		fmt.Printf("FTS search failed: %v\n", err)
	}

	// 3. Trigram Fuzzy Matching (Fuzzy/Typo Signal)
	var fuzzyNodes []uuid.UUID
	err = s.db.WithContext(ctx).Raw(`
		SELECT id FROM knowledge_nodes 
		WHERE name % ? 
		ORDER BY similarity(name, ?) DESC
		LIMIT ?`, query, query, topN).Scan(&fuzzyNodes).Error
	if err != nil {
		fmt.Printf("Fuzzy search failed: %v\n", err)
	}

	// 4. Weighted & Type-Aware Reciprocal Rank Fusion
	scores := make(map[uuid.UUID]float64)
	reasons := make(map[uuid.UUID]map[string]struct{})

	const (
		wVector = 1.0
		wFTS    = 3.0 // Further increased from 2.0
		wFuzzy  = 0.3 // Further reduced to minimize drift
	)

	// Fetch metas for boosting
	type nodeMeta struct {
		ID          uuid.UUID
		Type        string
		Name        string
		Description string
	}
	var metas []nodeMeta
	s.db.Table("knowledge_nodes").Select("id, type, COALESCE(NULLIF(display_name, ''), name) as name, description").Find(&metas)

	// Helper to check for word overlap
	queryWords := strings.Fields(strings.ToLower(query))

	applyWeight := func(id uuid.UUID, baseScore float64) float64 {
		multiplier := 1.0

		var m nodeMeta
		for _, v := range metas {
			if v.ID == id {
				m = v
				break
			}
		}

		nameLower := strings.ToLower(m.Name)
		descLower := strings.ToLower(m.Description) // Assume we added Description to nodeMeta

		hasOverlap := false
		for _, word := range queryWords {
			if len(word) > 3 { // Only consider meaningful long keywords
				if strings.Contains(nameLower, word) {
					multiplier *= 5.0 // MASSIVE boost for title match
					hasOverlap = true
					break
				}
				if strings.Contains(descLower, word) {
					hasOverlap = true
				}
			}
		}

		// Hard Filter: If neither name nor description contains any keyword, penalize heavily
		if !hasOverlap && len(queryWords) > 0 {
			multiplier *= 0.01
		}

		// Noise Node Penalty: Demote meta-components that soak up too many keywords
		if strings.Contains(nameLower, "container") || strings.Contains(nameLower, "page") || strings.Contains(nameLower, "layout") {
			multiplier *= 0.5
		}

		return baseScore * multiplier
	}

	for i, id := range vectorNodes {
		scores[id] += applyWeight(id, wVector/float64(k+(i+1)))
		if reasons[id] == nil {
			reasons[id] = map[string]struct{}{}
		}
		reasons[id]["semantic_similarity"] = struct{}{}
	}
	for i, id := range ftsNodes {
		scores[id] += applyWeight(id, wFTS/float64(k+(i+1)))
		if reasons[id] == nil {
			reasons[id] = map[string]struct{}{}
		}
		reasons[id]["exact_alias_match"] = struct{}{}
	}
	for i, id := range fuzzyNodes {
		scores[id] += applyWeight(id, wFuzzy/float64(k+(i+1)))
		if reasons[id] == nil {
			reasons[id] = map[string]struct{}{}
		}
		reasons[id]["fuzzy_match"] = struct{}{}
	}

	// 5. Sort by RRF score
	type scoredNode struct {
		ID    uuid.UUID
		Score float64
	}
	var sorted []scoredNode
	for id, score := range scores {
		sorted = append(sorted, scoredNode{ID: id, Score: score})
	}

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Score > sorted[j].Score
	})

	// 6. Return top 5 seed IDs (expanded from 3 to 5 for better graph entry points)
	seedMatches := make(map[uuid.UUID]seedMatch)
	limit := 5
	if len(sorted) < limit {
		limit = len(sorted)
	}
	for i := 0; i < limit; i++ {
		reasonList := make([]string, 0, len(reasons[sorted[i].ID]))
		for reason := range reasons[sorted[i].ID] {
			reasonList = append(reasonList, reason)
		}
		sort.Strings(reasonList)
		seedMatches[sorted[i].ID] = seedMatch{
			Score:   sorted[i].Score,
			Reasons: reasonList,
		}
	}

	return seedMatches, nil
}

// GlobalSearch performs a community-based search for broad queries.
func (s *GraphRAGService) GlobalSearch(ctx context.Context, query string) (*GlobalSearchResponse, error) {
	if err := s.ensureAIServiceAvailable(); err != nil {
		return nil, err
	}
	return s.aiService.GlobalSearch(ctx, query)
}

// BuildCommunities triggers the community detection and summarization pipeline.
func (s *GraphRAGService) BuildCommunities(ctx context.Context) error {
	if err := s.ensureAIServiceAvailable(); err != nil {
		return err
	}
	return s.aiService.BuildCommunities(ctx)
}

// StreamMechanismTree returns a reader for the streaming tree generation.
func (s *GraphRAGService) StreamMechanismTree(ctx context.Context, query string) (io.ReadCloser, error) {
	if err := s.ensureAIServiceAvailable(); err != nil {
		return nil, err
	}
	return s.aiService.StreamMechanismTree(ctx, query)
}

// StreamGlobalSearch returns a reader for the streaming global search generation.
func (s *GraphRAGService) StreamGlobalSearch(ctx context.Context, query string) (io.ReadCloser, error) {
	if err := s.ensureAIServiceAvailable(); err != nil {
		return nil, err
	}
	return s.aiService.StreamGlobalSearch(ctx, query)
}
