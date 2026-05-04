package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"repair-platform/models"
	"testing"
)

func TestAIService_GenerateMechanismTree(t *testing.T) {
	// mock server returning success
	successServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/generate/mechanism-tree" {
			t.Errorf("Expected path /generate/mechanism-tree, got %s", r.URL.Path)
		}

		mockNode := models.MechanismNode{
			ID:    "root-1",
			Title: "Test Node",
		}
		json.NewEncoder(w).Encode(mockNode)
	}))
	defer successServer.Close()

	// mock server returning error 500
	errorServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal python error"))
	}))
	defer errorServer.Close()

	t.Run("Success Response", func(t *testing.T) {
		aiService := &AIService{
			pythonServiceURL: successServer.URL,
			client:           successServer.Client(),
		}

		node, err := aiService.GenerateMechanismTree(context.Background(), "test query")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if node.ID != "root-1" || node.Title != "Test Node" {
			t.Errorf("Unexpected node data parsed: %+v", node)
		}
	})

	t.Run("Error Response Fallback", func(t *testing.T) {
		aiService := &AIService{
			pythonServiceURL: errorServer.URL,
			client:           errorServer.Client(),
		}

		_, err := aiService.GenerateMechanismTree(context.Background(), "test query")
		if err == nil {
			t.Fatal("Expected error from 500 response, got nil")
		}
		if err.Error() != "python service returned error: 500 - internal python error" {
			t.Errorf("Unexpected error message: %v", err)
		}
	})

	t.Run("Network Failure Fallback", func(t *testing.T) {
		aiService := &AIService{
			pythonServiceURL: "http://localhost:12345/unreachable",
			client:           http.DefaultClient,
		}

		node, err := aiService.GenerateMechanismTree(context.Background(), "test query")
		if err != nil {
			t.Fatalf("Expected fallback to mock data, not error: %v", err)
		}
		if node.ID != "root" || node.Title != "Fallback Mock: test query" {
			t.Errorf("Unexpected fallback node data parsed: %+v", node)
		}
	})
}

func TestAIService_GetEmbedding(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/embedding" {
			t.Errorf("Expected path /embedding, got %s", r.URL.Path)
		}

		res := embeddingResponse{
			Embedding: []float32{0.1, 0.2, 0.3},
		}
		json.NewEncoder(w).Encode(res)
	}))
	defer server.Close()

	aiService := &AIService{
		pythonServiceURL: server.URL,
		client:           server.Client(),
	}

	emb, err := aiService.GetEmbedding(context.Background(), "test text")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(emb) != 3 {
		t.Fatalf("Expected embedding length 3, got %d", len(emb))
	}
	if emb[0] != 0.1 || emb[1] != 0.2 || emb[2] != 0.3 {
		t.Errorf("Unexpected embedding values: %v", emb)
	}
}

func TestAIService_GlobalSearch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/graph/global-search" {
			t.Errorf("Expected path /graph/global-search, got %s", r.URL.Path)
		}

		res := map[string]any{
			"answer": "summary",
			"sections": map[string]any{
				"mechanism_check": map[string]any{
					"body":    "Mechanism is sound.",
					"verdict": "sound",
				},
				"search_diagnostics": map[string]any{
					"intent_type":               "convergent",
					"recommended_vector_weight": 0.2,
					"barrier_triggered":         false,
				},
			},
			"format_version": "v2",
			"format_kind":    "structured_json",
			"sanitized":      true,
		}
		json.NewEncoder(w).Encode(res)
	}))
	defer server.Close()

	aiService := &AIService{
		pythonServiceURL: server.URL,
		client:           server.Client(),
	}

	result, err := aiService.GlobalSearch(context.Background(), "react 19")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result.Answer != "summary" {
		t.Fatalf("Expected answer to be summary, got %s", result.Answer)
	}
	if result.FormatVersion != "v2" {
		t.Fatalf("Expected format version v2, got %s", result.FormatVersion)
	}
	if result.FormatKind != "structured_json" {
		t.Fatalf("Expected structured format, got %s", result.FormatKind)
	}
	if result.Sections == nil || result.Sections.MechanismCheck == nil {
		t.Fatal("Expected structured sections to be decoded")
	}
	if result.Sections.MechanismCheck.Verdict != "sound" {
		t.Fatalf("Expected sound verdict, got %s", result.Sections.MechanismCheck.Verdict)
	}
}
