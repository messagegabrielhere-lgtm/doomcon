import SwiftUI

struct MemoriesView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var search = ""
    @State private var kind: MemoryKind?
    @State private var editing: Memory?

    private var shown: [Memory] {
        store.archive.memories
            .filter { kind == nil || $0.kind == kind }
            .filter {
                search.isEmpty
                    || $0.text.localizedCaseInsensitiveContains(search)
                    || ($0.prompt ?? "").localizedCaseInsensitiveContains(search)
            }
            .sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(shown) { memory in
                    Button { editing = memory } label: { MemoryRow(memory: memory, people: store.archive.legacy.beneficiaries) }
                        .foregroundStyle(Color.ink)
                }
                .onDelete { offsets in
                    let doomed = offsets.map { shown[$0] }
                    doomed.forEach(store.delete)
                }
            }
            .overlay {
                if store.archive.memories.isEmpty {
                    ContentUnavailableView("No memories yet", systemImage: "books.vertical",
                                           description: Text("Start in the Record tab. Every answer, story and correction shows up here."))
                } else if shown.isEmpty {
                    ContentUnavailableView.search(text: search)
                }
            }
            .searchable(text: $search)
            .brandBackground()
            .navigationTitle("Memories")
            .toolbar {
                Menu {
                    Picker("Type", selection: $kind) {
                        Text("All").tag(MemoryKind?.none)
                        ForEach(MemoryKind.allCases) { k in
                            Label(k.label, systemImage: k.symbol).tag(Optional(k))
                        }
                    }
                } label: {
                    Image(systemName: kind == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                }
            }
            .sheet(item: $editing) { memory in
                MemoryEditor(memory: memory, isNew: false)
            }
        }
    }
}

private struct MemoryRow: View {
    let memory: Memory
    let people: [Beneficiary]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label(memory.kind.label, systemImage: memory.kind.symbol)
                Spacer()
                Text(memory.createdAt, format: .dateTime.day().month().year())
            }
            .font(.caption)
            .foregroundStyle(Color.slate)
            if let prompt = memory.prompt {
                Text(prompt).font(.subheadline.weight(.semibold))
            }
            Text(memory.text).lineLimit(3)
            if !memory.restrictedTo.isEmpty {
                let names = people.filter { memory.restrictedTo.contains($0.id) }.map(\.name)
                Label(names.isEmpty ? "No one" : "Only " + names.formatted(.list(type: .and)), systemImage: "lock")
                    .font(.caption)
                    .foregroundStyle(Color.slate)
            }
        }
        .padding(.vertical, 2)
    }
}
