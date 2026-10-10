import CommonCrypto
import CoreTransferable
import CryptoKit
import Foundation
import UniformTypeIdentifiers

extension UTType {
    /// A sealed Still Me legacy file (.stillme). Declared in project.yml.
    static let stillMeLegacy = UTType(exportedAs: "com.messagegabrielhere.stillme.legacy")
}

/// The file a person receives: who it's from and for (readable, so they know what
/// it is), and the archive encrypted with a key derived from the unlock code.
struct SealedLegacy: Codable {
    var format = "stillme-legacy"
    var version = 1
    var fromName: String
    var forName: String
    var salt: Data
    var rounds: Int
    /// AES-GCM combined box: nonce, ciphertext and tag.
    var box: Data
}

enum LegacySealError: LocalizedError {
    case notALegacyFile, wrongCode, damaged

    var errorDescription: String? {
        switch self {
        case .notALegacyFile: "This isn't a Still Me legacy file."
        case .wrongCode: "That code doesn't open this file. Check it letter by letter."
        case .damaged: "This file is damaged. Ask for a fresh copy."
        }
    }
}

enum LegacySeal {
    static let rounds = 600_000

    /// A human-typable code like "K7QM-3XRP-9WTD-HF2A" (80 bits; no 0/O/1/I).
    static func newCode() -> String {
        let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let chars = bytes.map { alphabet[Int($0) % alphabet.count] }
        return stride(from: 0, to: 16, by: 4).map { String(chars[$0..<$0 + 4]) }.joined(separator: "-")
    }

    /// Uppercase, letters and digits only, so dashes, spaces and case don't matter.
    static func normalize(_ code: String) -> String {
        code.uppercased().filter { $0.isLetter || $0.isNumber }
    }

    static func seal(_ package: LegacyPackage, code: String) throws -> Data {
        var salt = Data(count: 16)
        _ = salt.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 16, $0.baseAddress!) }
        let key = try deriveKey(code: code, salt: salt, rounds: rounds)
        let plain = try JSONEncoder.stillme.encode(package)
        guard let box = try AES.GCM.seal(plain, using: key).combined else { throw LegacySealError.damaged }
        let file = SealedLegacy(fromName: package.ownerName, forName: package.recipient.name,
                                salt: salt, rounds: rounds, box: box)
        return try JSONEncoder.stillme.encode(file)
    }

    /// Reads who a file is from and for without unlocking it.
    static func peek(_ data: Data) throws -> SealedLegacy {
        guard let file = try? JSONDecoder.stillme.decode(SealedLegacy.self, from: data),
              file.format == "stillme-legacy" else { throw LegacySealError.notALegacyFile }
        return file
    }

    static func open(_ data: Data, code: String) throws -> LegacyPackage {
        let file = try peek(data)
        let key = try deriveKey(code: code, salt: file.salt, rounds: file.rounds)
        let plain: Data
        do {
            plain = try AES.GCM.open(AES.GCM.SealedBox(combined: file.box), using: key)
        } catch {
            throw LegacySealError.wrongCode
        }
        guard let package = try? JSONDecoder.stillme.decode(LegacyPackage.self, from: plain) else {
            throw LegacySealError.damaged
        }
        return package
    }

    /// PBKDF2-SHA256, so guessing codes is slow even with the file in hand.
    private static func deriveKey(code: String, salt: Data, rounds: Int) throws -> SymmetricKey {
        let password = Array(normalize(code).utf8)
        var derived = [UInt8](repeating: 0, count: 32)
        let status = salt.withUnsafeBytes { saltBytes in
            CCKeyDerivationPBKDF(
                CCPBKDFAlgorithm(kCCPBKDF2),
                password.map { CChar(bitPattern: $0) }, password.count,
                saltBytes.bindMemory(to: UInt8.self).baseAddress, salt.count,
                CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(rounds),
                &derived, derived.count
            )
        }
        guard status == Int32(kCCSuccess) else { throw LegacySealError.damaged }
        return SymmetricKey(data: derived)
    }
}

/// A sealed file, ready for the share sheet.
struct SealedLegacyFile: Transferable {
    let data: Data
    let fileName: String

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .stillMeLegacy) { $0.data }
            .suggestedFileName { $0.fileName }
    }
}
