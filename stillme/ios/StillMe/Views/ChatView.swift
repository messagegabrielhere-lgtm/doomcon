import SwiftUI

/// A conversation with the persona. Used both for rehearsal (owner) and by recipients.
@MainActor
struct ChatView: View {
    @Binding var messages: [ChatMessage]
    let personaName: String
    let send: @MainActor ([ChatMessage]) -> AsyncThrowingStream<String, Error>
    /// When set, assistant messages get a "That's not me" action.
    var onCorrect: (@MainActor (_ question: String, _ reply: String) -> Void)?
    var onChange: @MainActor () -> Void = {}
    /// Shown, with tappable starter messages, before the first message.
    var intro: String?
    var suggestions: [String] = []

    @State private var draft = ""
    @State private var isReplying = false
    @State private var error: String?
    @FocusState private var focused: Bool

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 10) {
                    if messages.isEmpty { emptyState }
                    ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                        Bubble(message: message, personaName: personaName)
                            .contextMenu {
                                Button("Copy", systemImage: "doc.on.doc") { UIPasteboard.general.string = message.content }
                                if let onCorrect, message.role == .assistant, index > 0 {
                                    Button("That's not me", systemImage: "arrow.uturn.backward.circle") {
                                        onCorrect(messages[index - 1].content, message.content)
                                    }
                                }
                            }
                            .id(message.id)
                    }
                    if let error {
                        Text(error).font(.footnote).foregroundStyle(.red).id("error")
                    }
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: messages.last?.content) {
                if let id = messages.last?.id { proxy.scrollTo(id, anchor: .bottom) }
            }
        }
        .safeAreaInset(edge: .bottom) {
            HStack(alignment: .bottom, spacing: 8) {
                TextField("Message \(personaName)…", text: $draft, axis: .vertical)
                    .lineLimit(1...6)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.card, in: RoundedRectangle(cornerRadius: 20))
                    .focused($focused)
                Button {
                    Task { await submit() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.system(size: 32))
                }
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isReplying)
                .accessibilityLabel("Send")
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(.bar)
        }
        .background(Color.canvas.ignoresSafeArea())
    }

    @ViewBuilder private var emptyState: some View {
        VStack(spacing: 16) {
            PulseMark().frame(width: 56)
            if let intro {
                Text(intro)
                    .font(.callout)
                    .foregroundStyle(Color.slate)
                    .multilineTextAlignment(.center)
            }
            if !suggestions.isEmpty {
                VStack(spacing: 8) {
                    ForEach(suggestions, id: \.self) { suggestion in
                        Button {
                            draft = suggestion
                            Task { await submit() }
                        } label: {
                            Text(suggestion)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.ink)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 9)
                                .frame(maxWidth: .infinity)
                                .background(Color.card, in: Capsule())
                                .overlay(Capsule().strokeBorder(Color.slate.opacity(0.25)))
                        }
                        .buttonStyle(.plain)
                        .disabled(isReplying)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 48)
    }

    private func submit() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        draft = ""
        error = nil
        isReplying = true
        defer { isReplying = false; onChange() }

        messages.append(ChatMessage(role: .user, content: text))
        let history = messages
        messages.append(ChatMessage(role: .assistant, content: ""))
        let index = messages.count - 1
        do {
            for try await chunk in send(history) {
                messages[index].content += chunk
            }
            if messages[index].content.isEmpty { messages.remove(at: index) }
        } catch {
            // Drop any partial reply so the history stays clean, and let them retry.
            messages.remove(at: index)
            if messages.last?.role == .user { draft = messages.removeLast().content }
            self.error = error.localizedDescription
        }
    }
}

private struct Bubble: View {
    let message: ChatMessage
    let personaName: String

    var body: some View {
        let mine = message.role == .user
        HStack {
            if mine { Spacer(minLength: 48) }
            Group {
                if message.content.isEmpty {
                    ProgressView().padding(.horizontal, 6)
                } else {
                    Text(message.content)
                        .textSelection(.enabled)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(mine ? Color.pulse : Color.card,
                        in: RoundedRectangle(cornerRadius: 18))
            .overlay {
                if !mine { RoundedRectangle(cornerRadius: 18).strokeBorder(Color.slate.opacity(0.25)) }
            }
            .foregroundStyle(mine ? Color.onAccent : Color.ink)
            .accessibilityLabel(mine ? "You: \(message.content)" : "\(personaName) AI: \(message.content)")
            if !mine { Spacer(minLength: 48) }
        }
    }
}
