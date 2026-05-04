import Foundation

enum Tabs: CaseIterable {
    case home, new, radio, library, search
    
    /// Tabbar title
    var title: String {
        switch self {
        case .home: return "Home"
        case .new: return "New"
        case .radio: return "Radio"
        case .library: return "Library"
        case .search: return "Search"
        }
    }
    
    /// Tabbar icon name
    var image: String {
        switch self {
        case .home: return "house.fill"
        case .new: return "square.grid.2x2.fill"
        case .radio: return "dot.radiowaves.left.and.right"
        case .library: return "square.stack.fill"
        case .search: return "magnifyingglass"
        }
    }
}
