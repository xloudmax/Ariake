package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"repair-platform/config"
	"repair-platform/models"
	"time"

	"github.com/goccy/go-json"
)

type AIService struct {
	pythonServiceURL string
	client           *http.Client
}

func NewAIService() *AIService {
	cfg := config.GetConfig()

	// Parse timeout
	timeout, err := time.ParseDuration(cfg.AIServiceTimeout)
	if err != nil || cfg.AIServiceTimeout == "" {
		timeout = 150 * time.Second
	}

	return &AIService{
		pythonServiceURL: cfg.AIServiceURL,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

type mechanismRequest struct {
	Query string `json:"query"`
}

func (s *AIService) GenerateMechanismTree(ctx context.Context, query string) (*models.MechanismNode, error) {
	reqBody := mechanismRequest{
		Query: query,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Safely construct the URL
	u, err := url.Parse(s.pythonServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid AI service URL: %w", err)
	}
	u.Path = "/generate/mechanism-tree"

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		// Fallback for demo if python service is not running or timeout occurs
		fmt.Printf("AI service error (%v), returning fallback mock data\n", err)
		return getFallbackMockData(query), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("python service returned error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	var root models.MechanismNode
	if err := json.NewDecoder(resp.Body).Decode(&root); err != nil {
		return nil, fmt.Errorf("failed to decode python service response: %w", err)
	}

	return &root, nil
}

// StreamMechanismTree calls the Python service's streaming endpoint and returns the response body as a reader.
func (s *AIService) StreamMechanismTree(ctx context.Context, query string) (io.ReadCloser, error) {
	reqBody := mechanismRequest{
		Query: query,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	u, err := url.Parse(s.pythonServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid AI service URL: %w", err)
	}
	u.Path = "/generate/mechanism-tree/stream"

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call streaming ai service: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("python streaming service returned error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	return resp.Body, nil
}

type embeddingRequest struct {
	Text string `json:"text"`
}

type embeddingResponse struct {
	Embedding []float32 `json:"embedding"`
}

// GetEmbedding calls the Python service to simplify embedding generation using the shared OpenAI client.
func (s *AIService) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	reqBody := embeddingRequest{Text: text}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	u, _ := url.Parse(s.pythonServiceURL)
	u.Path = "/embedding"

	req, _ := http.NewRequestWithContext(ctx, "POST", u.String(), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai_service returned %d", resp.StatusCode)
	}

	var res embeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return res.Embedding, nil
}

type globalSearchRequest struct {
	Query string `json:"query"`
}

type MechanismCheckSection struct {
	Body    string `json:"body"`
	Verdict string `json:"verdict,omitempty"`
}

type FeasibilityCheckSection struct {
	Body    string `json:"body"`
	Verdict string `json:"verdict,omitempty"`
}

type SearchDiagnosticsSection struct {
	IntentType              string  `json:"intent_type"`
	RecommendedVectorWeight float64 `json:"recommended_vector_weight"`
	BarrierTriggered        bool    `json:"barrier_triggered"`
}

type SupportingCommunity struct {
	CommunityID         int      `json:"community_id"`
	Title               string   `json:"title"`
	Summary             string   `json:"summary"`
	Score               float64  `json:"score"`
	RepresentativePosts []string `json:"representative_posts,omitempty"`
	TopTerms            []string `json:"top_terms,omitempty"`
	SummaryConfidence   float64  `json:"summary_confidence,omitempty"`
}

type SupportingPost struct {
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt,omitempty"`
	Slug        string `json:"slug,omitempty"`
	CommunityID *int   `json:"community_id,omitempty"`
	Source      string `json:"source,omitempty"`
}

type RetrievalDiagnostics struct {
	SearchMode            string `json:"search_mode"`
	CommunitiesConsidered int    `json:"communities_considered"`
	CommunitiesRetained   int    `json:"communities_retained"`
	BridgeStrength        string `json:"bridge_strength"`
	RankingFormula        string `json:"ranking_formula,omitempty"`
}

type GlobalInsightSection struct {
	Summary string   `json:"summary"`
	Details []string `json:"details,omitempty"`
}

type ActionSummaryItem struct {
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Priority string `json:"priority"`
	Lane     string `json:"lane"`
}

type GlobalInsightSections struct {
	ThinkingSummary   []string                  `json:"thinking_summary,omitempty"`
	MechanismCheck    *MechanismCheckSection    `json:"mechanism_check,omitempty"`
	FeasibilityCheck  *FeasibilityCheckSection  `json:"feasibility_check,omitempty"`
	SearchDiagnostics *SearchDiagnosticsSection `json:"search_diagnostics,omitempty"`
	GlobalInsight     *GlobalInsightSection     `json:"global_insight,omitempty"`
	ActionSummary     []ActionSummaryItem       `json:"action_summary,omitempty"`
}

type GlobalSearchResponse struct {
	Answer                string                 `json:"answer"`
	Sections              *GlobalInsightSections `json:"sections,omitempty"`
	FormatVersion         string                 `json:"format_version,omitempty"`
	FormatKind            string                 `json:"format_kind,omitempty"`
	Sanitized             bool                   `json:"sanitized"`
	IsDraft               bool                   `json:"is_draft,omitempty"`
	SupportingCommunities []SupportingCommunity  `json:"supporting_communities,omitempty"`
	SupportingPosts       []SupportingPost       `json:"supporting_posts,omitempty"`
	RetrievalDiagnostics  *RetrievalDiagnostics  `json:"retrieval_diagnostics,omitempty"`
}

// GlobalSearch calls the Python service to perform a community-based global search.
func (s *AIService) GlobalSearch(ctx context.Context, query string) (*GlobalSearchResponse, error) {
	reqBody := globalSearchRequest{Query: query}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	u, _ := url.Parse(s.pythonServiceURL)
	u.Path = "/graph/global-search"

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai_service returned %d", resp.StatusCode)
	}

	var res GlobalSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}

// StreamGlobalSearch proxies the Python service global search SSE endpoint.
func (s *AIService) StreamGlobalSearch(ctx context.Context, query string) (io.ReadCloser, error) {
	reqBody := globalSearchRequest{Query: query}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	u, err := url.Parse(s.pythonServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid AI service URL: %w", err)
	}
	u.Path = "/graph/global-search/stream"

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call streaming ai service: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("python streaming service returned error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	return resp.Body, nil
}

// BuildCommunities triggers Leiden clustering and community summarization in the Python service.
func (s *AIService) BuildCommunities(ctx context.Context) error {
	u, _ := url.Parse(s.pythonServiceURL)
	u.Path = "/graph/build-communities"

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		return err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("ai_service returned %d", resp.StatusCode)
	}

	return nil
}

func getFallbackMockData(query string) *models.MechanismNode {
	activeIngredient := "Service Unavailable - Mocking"
	return &models.MechanismNode{
		ID:               "root",
		Title:            fmt.Sprintf("Fallback Mock: %s", query),
		ActiveIngredient: &activeIngredient,
		Children: []*models.MechanismNode{
			{
				ID:    "error-node",
				Title: "Python Service Not Reachable or Timeout",
				Children: []*models.MechanismNode{
					{ID: "check-1", Title: "Check if main.py is running"},
					{ID: "check-2", Title: "Check port 8000"},
					{ID: "check-3", Title: "Check network connection and AI_SERVICE_URL"},
				},
			},
		},
	}
}
