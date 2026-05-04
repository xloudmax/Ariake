import SwiftUI

struct ContentView: View {
    @State private var expandMiniPlayer: Bool = false
    @Namespace private var animation
    var body: some View {
        Group {
            if #available(iOS 26, *) {
                TabbarView()
                    .tabBarMinimizeBehavior(.onScrollDown)
                    .tabViewBottomAccessory {
                        MiniPlayerView()
                            .matchedTransitionSource(id: "MINIPLAYER", in: animation)
                            .onTapGesture {
                                expandMiniPlayer.toggle()
                            }
                    }
            } else {
                TabbarView(safeAreaBottomPadding: 60)
                    .overlay(alignment: .bottom) {
                        MiniPlayerView()
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial, in: .rect(cornerRadius: 15, style: .continuous))
                            .matchedTransitionSource(id: "MINIPLAYER", in: animation)
                            .onTapGesture {
                                expandMiniPlayer.toggle()
                            }
                            .offset(y: -60)
                            .padding(.horizontal, 15)
                    }
                    .ignoresSafeArea(.keyboard, edges: .all)
            }
        }
        .fullScreenCover(isPresented: $expandMiniPlayer) {
            ScrollView {
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 10) {
                    Capsule()
                        .fill(.primary.secondary)
                        .frame(width: 35, height: 3)
                    
                    HStack(spacing: 0) {
                        PlayerInfo(size: .init(width: 80, height: 80))
                        Spacer(minLength: 0)
                        
                        Group {
                            Button("", systemImage: "star.circle.fill") {
                            }
                            
                            Button("", systemImage: "ellipsis.circle.fill") {
                            }
                        }
                        .font(.title)
                        .foregroundStyle(.primary, .primary.opacity(0.1))
                    }
                    .padding(.horizontal, 15)
                }
                .navigationTransition(.zoom(sourceID: "MINIPLAYER", in: animation))
            }
            /// To  Avoid Transparency!
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.background)
        }
    }
}

#Preview {
    ContentView()
}
