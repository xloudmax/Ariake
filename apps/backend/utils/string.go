package utils

import (
	"unicode/utf8"
)

// TruncateString safely truncates a string to a maximum number of bytes
// while ensuring it doesn't break multi-byte UTF-8 characters.
// If the string is longer than maxBytes, it will be truncated and (optionally)
// appended with an ellipsis if there is space.
func TruncateString(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}

	// Slicing to maxBytes might break a multi-byte character
	res := s[:maxBytes]
	
	// Check if we are in the middle of a UTF-8 character
	// utf8.ValidString checks the entire string, but we only need to check the end
	for i := 0; i < 3 && i < len(res); i++ {
		// Try to decode the last rune to see if it's valid
		if utf8.ValidString(res) {
			break
		}
		// If not valid, remove the last byte and try again
		res = res[:len(res)-1]
	}
	
	return res
}

// TruncateStringWithEllipsis truncates a string and adds "..." if it was truncated.
// The total length will not exceed maxBytes.
func TruncateStringWithEllipsis(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}

	// Leave 3 bytes for "..."
	if maxBytes <= 3 {
		return TruncateString(s, maxBytes)
	}

	truncated := TruncateString(s, maxBytes-3)
	return truncated + "..."
}
