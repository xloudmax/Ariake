package utils

import (
	"testing"
)

func TestTruncateString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		maxBytes int
		expected string
	}{
		{
			name:     "ASCII No Truncation",
			input:    "Hello",
			maxBytes: 10,
			expected: "Hello",
		},
		{
			name:     "ASCII Truncation",
			input:    "Hello World",
			maxBytes: 5,
			expected: "Hello",
		},
		{
			name:     "Chinese Safe Boundary",
			input:    "获取的数据", // 15 bytes total (3 per char)
			maxBytes: 6,
			expected: "获取",
		},
		{
			name:     "Chinese Unsafe Boundary (Middle of char)",
			input:    "获取的数据", // 3, 3, 3, 3, 3
			maxBytes: 4,      // Cuts in middle of '取' (bytes 4-6)
			expected: "获",   // Should drop the partial '取' and keep '获'
		},
		{
			name:     "Chinese Unsafe Boundary 2",
			input:    "获取的数据",
			maxBytes: 5,
			expected: "获", // Still only '获' fits completely
		},
		{
			name:     "Empty String",
			input:    "",
			maxBytes: 5,
			expected: "",
		},
		{
			name:     "Zero MaxBytes",
			input:    "Hello",
			maxBytes: 0,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TruncateString(tt.input, tt.maxBytes)
			if result != tt.expected {
				t.Errorf("TruncateString(%q, %d) = %q; want %q", tt.input, tt.maxBytes, result, tt.expected)
			}
		})
	}
}

func TestTruncateStringWithEllipsis(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		maxBytes int
		expected string
	}{
		{
			name:     "No Truncation",
			input:    "Hello",
			maxBytes: 10,
			expected: "Hello",
		},
		{
			name:     "Truncation with Ellipsis",
			input:    "Hello World",
			maxBytes: 8,
			expected: "Hello...", // "Hello" (5) + "..." (3) = 8
		},
		{
			name:     "Chinese Truncation with Ellipsis",
			input:    "获取的数据",
			maxBytes: 9, // "获取" (6) + "..." (3) = 9
			expected: "获取...",
		},
		{
			name:     "Chinese Partial Truncation",
			input:    "获取的数据",
			maxBytes: 7, // "获" (3) + "..." (3) = 6. "获取" (6) + "..." (3) = 9 (too long)
			expected: "获...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TruncateStringWithEllipsis(tt.input, tt.maxBytes)
			if result != tt.expected {
				t.Errorf("TruncateStringWithEllipsis(%q, %d) = %q; want %q", tt.input, tt.maxBytes, result, tt.expected)
			}
		})
	}
}
