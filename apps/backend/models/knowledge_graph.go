package models

import (
	"time"

	"github.com/google/uuid"
)

// KnowledgeNode represents an entity or concept in the knowledge graph.
type KnowledgeNode struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name          string         `gorm:"type:string;not null;index" json:"name"`
	CanonicalName string         `gorm:"type:string;index" json:"canonical_name"`
	DisplayName   string         `gorm:"type:string" json:"display_name"`
	Type          string         `gorm:"type:string" json:"type"`
	Description   string         `gorm:"type:text" json:"description"`
	Embedding     []float32      `gorm:"type:vector(1536)" json:"-"` // Handled via raw SQL if needed
	CommunityID   *int           `gorm:"index" json:"community_id"`  // Community assignment via Leiden
	Metadata      map[string]any `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// Community represents a cluster of nodes in the knowledge graph.
type Community struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CommunityID int            `gorm:"uniqueIndex" json:"community_id"`
	Level       int            `json:"level"` // Hierarchical level (0=leaf, 1=aggregated...)
	Title       string         `json:"title"`
	Summary     string         `gorm:"type:text" json:"summary"`
	Findings    map[string]any `gorm:"type:jsonb;default:'{}'" json:"findings"` // Key takeaways
	Metadata    map[string]any `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// KnowledgeEdge represents a relationship between two nodes.
type KnowledgeEdge struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SourceID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"source_id"`
	TargetID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"target_id"`
	RelationType   string         `gorm:"type:string" json:"relation_type"`
	Description    string         `gorm:"type:text" json:"description"`
	Weight         float64        `gorm:"type:float;default:1.0" json:"weight"`
	Confidence     float64        `gorm:"type:float;default:0.6" json:"confidence"`
	EvidenceCount  int            `gorm:"default:1" json:"evidence_count"`
	Directionality string         `gorm:"type:string;default:'directed'" json:"directionality"`
	SourcePostIDs  []string       `gorm:"type:jsonb;default:'[]'" json:"source_post_ids"`
	SourceSpans    []string       `gorm:"type:jsonb;default:'[]'" json:"source_spans"`
	Metadata       map[string]any `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt      time.Time      `json:"created_at"`
}

type KnowledgeEvidence struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	NodeID     *uuid.UUID     `gorm:"type:uuid;index" json:"node_id,omitempty"`
	EdgeID     *uuid.UUID     `gorm:"type:uuid;index" json:"edge_id,omitempty"`
	EntityKind string         `gorm:"type:string;index" json:"entity_kind"`
	PostID     string         `gorm:"type:string" json:"post_id"`
	SourceSpan string         `gorm:"type:text" json:"source_span"`
	Signature  string         `gorm:"type:string;index" json:"signature"`
	Metadata   map[string]any `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt  time.Time      `json:"created_at"`
}

// TableName overrides the table name for KnowledgeNode.
func (KnowledgeNode) TableName() string {
	return "knowledge_nodes"
}

// TableName overrides the table name for KnowledgeEdge.
func (KnowledgeEdge) TableName() string {
	return "knowledge_edges"
}

// TableName overrides the table name for Community.
func (Community) TableName() string {
	return "communities"
}

func (KnowledgeEvidence) TableName() string {
	return "knowledge_evidence"
}

// GraphSearchResult represents a single node returned from a multi-hop search.
type GraphSearchResult struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	CanonicalName string    `json:"canonical_name"`
	DisplayName   string    `json:"display_name"`
	Description   string    `json:"description"`
	Type          string    `json:"type"`
	HopLevel      int       `json:"hop_level"`
	CommunityID   *int      `json:"community_id"`
	Score         float64   `json:"score"`
	SeedScore     float64   `json:"seed_score"`
	PathStrength  float64   `json:"path_strength"`
	MatchReasons  []string  `gorm:"type:jsonb" json:"match_reasons"`
	Aliases       []string  `gorm:"type:jsonb" json:"aliases"`
	SourcePostIDs []string  `gorm:"type:jsonb" json:"source_post_ids"`
}

// GraphEdge represents a relationship between nodes in a search result.
type GraphEdge struct {
	ID            uuid.UUID `json:"id" gorm:"column:id"`
	SourceID      uuid.UUID `json:"source_id" gorm:"column:source_id"`
	TargetID      uuid.UUID `json:"target_id" gorm:"column:target_id"`
	Type          string    `json:"relation_type" gorm:"column:relation_type"`
	Confidence    float64   `json:"confidence" gorm:"column:confidence"`
	EvidenceCount int       `json:"evidence_count" gorm:"column:evidence_count"`
}
