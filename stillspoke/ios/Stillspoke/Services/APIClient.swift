import Foundation

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Talks to the Stillspoke server (see server/). The app never holds an AI API key;
/// the server does, and it decides what each caller is allowed to see.
struct APIClient {
    enum Credential {
        case owner(String)
        case legacy(String)

        var header: String {
            switch self {
            case .owner(let token): "Bearer \(token)"
            case .legacy(let code): "Legacy \(code)"
            }
        }
    }

    static let serverURLKey = "serverURL"

    static var baseURL: URL {
        let candidates = [
            UserDefaults.standard.string(forKey: serverURLKey),
            Bundle.main.object(forInfoDictionaryKey: "StillspokeServerURL") as? String,
        ]
        for case let string? in candidates {
            let trimmed = string.trimmingCharacters(in: .whitespaces)
            if let url = URL(string: trimmed), url.scheme?.hasPrefix("http") == true, url.host() != nil { return url }
        }
        return URL(string: "http://localhost:8787")!
    }

    var credential: Credential?

    // MARK: Owner

    static func createAccount() async throws -> String {
        struct Out: Decodable { let token: String }
        let out: Out = try await APIClient().send("POST", "/v1/accounts")
        return out.token
    }

    func status() async throws -> AccountStatus {
        try await send("GET", "/v1/me")
    }

    func upload(_ archive: Archive) async throws -> AccountStatus {
        try await send("PUT", "/v1/archive", body: archive)
    }

    func checkIn() async throws -> AccountStatus {
        try await send("POST", "/v1/checkin")
    }

    func revoke() async throws -> AccountStatus {
        try await send("POST", "/v1/revoke")
    }

    func deleteAccount() async throws {
        struct Out: Decodable { let deleted: Bool }
        let _: Out = try await send("DELETE", "/v1/account")
    }

    /// Questions the AI interviewer suggests after reading the synced archive.
    func followUps(alreadyAsked: [String]) async throws -> [FollowUpQuestion] {
        struct In: Encodable { let alreadyAsked: [String] }
        struct Out: Decodable { let questions: [FollowUpQuestion] }
        let out: Out = try await send("POST", "/v1/interviewer", body: In(alreadyAsked: alreadyAsked))
        return out.questions
    }

    // MARK: Recipient

    static func redeem(code: String) async throws -> LegacyGrant {
        struct In: Encodable { let code: String }
        return try await APIClient().send("POST", "/v1/redeem", body: In(code: code))
    }

    // MARK: Chat

    /// Streams the persona's reply, chunk by chunk.
    func chat(_ messages: [ChatMessage], asBeneficiaryId: String? = nil) -> AsyncThrowingStream<String, Error> {
        struct In: Encodable { let messages: [ChatMessage]; let asBeneficiaryId: String? }
        struct Event: Decodable { let type: String; let text: String?; let message: String? }

        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let request = try makeRequest("POST", "/v1/chat", body: In(messages: messages, asBeneficiaryId: asBeneficiaryId))
                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse else { throw APIError(message: "No response") }
                    guard http.statusCode == 200 else {
                        var data = Data()
                        for try await byte in bytes { data.append(byte) }
                        throw Self.error(from: data, status: http.statusCode)
                    }
                    for try await line in bytes.lines {
                        guard line.hasPrefix("data: ") else { continue }
                        let event = try JSONDecoder().decode(Event.self, from: Data(line.dropFirst(6).utf8))
                        switch event.type {
                        case "text": continuation.yield(event.text ?? "")
                        case "error": throw APIError(message: event.message ?? "Something went wrong.")
                        default: break
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // MARK: Plumbing

    private func makeRequest(_ method: String, _ path: String, body: (any Encodable)? = nil) throws -> URLRequest {
        var request = URLRequest(url: Self.baseURL.appending(path: path))
        request.httpMethod = method
        request.timeoutInterval = 120
        if let credential { request.setValue(credential.header, forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder.stillspoke.encode(body)
        }
        return request
    }

    private func send<T: Decodable>(_ method: String, _ path: String, body: (any Encodable)? = nil) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: makeRequest(method, path, body: body))
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw Self.error(from: data, status: status) }
        return try JSONDecoder.stillspoke.decode(T.self, from: data)
    }

    private static func error(from data: Data, status: Int) -> APIError {
        struct Body: Decodable { let error: String }
        let message = (try? JSONDecoder().decode(Body.self, from: data))?.error
        return APIError(message: message ?? "The server returned an error (\(status)).")
    }
}
