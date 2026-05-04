package services

import (
	"github.com/jomei/notionapi"
	"testing"
)

func TestGenerateSlug(t *testing.T) {
	s := &NotionService{}

	title := "Hello World Test"
	slug := s.generateSlug(title)

	if slug == "" {
		t.Error("Expected valid slug, got empty string")
	}

	// Should contain the title parts
	if slug[:16] != "Hello-World-Test" {
		t.Errorf("Expected slug to start with 'Hello-World-Test', got: %s", slug)
	}
}

func TestRichTextToMarkdown(t *testing.T) {
	s := &NotionService{}

	tests := []struct {
		name     string
		input    []notionapi.RichText
		expected string
	}{
		{
			name: "Bold and Italic text",
			input: []notionapi.RichText{
				{
					PlainText: "Bold",
					Annotations: &notionapi.Annotations{
						Bold: true,
					},
				},
				{
					PlainText: " ",
				},
				{
					PlainText: "Italic",
					Annotations: &notionapi.Annotations{
						Italic: true,
					},
				},
			},
			expected: "**Bold** *Italic*",
		},
		{
			name: "Code with link",
			input: []notionapi.RichText{
				{
					PlainText: "CodeLink",
					Href:      "https://example.com",
					Annotations: &notionapi.Annotations{
						Code: true,
					},
				},
			},
			expected: "[`CodeLink`](https://example.com)",
		},
		{
			name: "Strikethrough",
			input: []notionapi.RichText{
				{
					PlainText: "striked",
					Annotations: &notionapi.Annotations{
						Strikethrough: true,
					},
				},
			},
			expected: "~~striked~~",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := s.richTextToMarkdown(tt.input)
			if got != tt.expected {
				t.Errorf("richTextToMarkdown() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestGetPageTitle(t *testing.T) {
	s := &NotionService{}

	tests := []struct {
		name     string
		page     *notionapi.Page
		expected string
		hasError bool
	}{
		{
			name: "Valid title",
			page: &notionapi.Page{
				Properties: map[string]notionapi.Property{
					"Name": &notionapi.TitleProperty{
						Type: notionapi.PropertyTypeTitle,
						Title: []notionapi.RichText{
							{PlainText: "Test "},
							{PlainText: "Title"},
						},
					},
				},
			},
			expected: "Test Title",
		},
		{
			name: "Missing title",
			page: &notionapi.Page{
				Properties: map[string]notionapi.Property{
					"Name": &notionapi.RichTextProperty{},
				},
			},
			expected: "Untitled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := s.getPageTitle(tt.page)
			if (err != nil) != tt.hasError {
				t.Errorf("getPageTitle() error = %v, wantErr %v", err, tt.hasError)
				return
			}
			if got != tt.expected {
				t.Errorf("getPageTitle() = %v, want %v", got, tt.expected)
			}
		})
	}
}
