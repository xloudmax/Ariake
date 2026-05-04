package models

type MechanismNode struct {
	ID               string           `json:"id"`
	Title            string           `json:"title"`
	ActiveIngredient *string          `json:"active_ingredient,omitempty"`
	Children         []*MechanismNode `json:"children,omitempty"`
}
