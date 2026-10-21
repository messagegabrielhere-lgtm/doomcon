import XCTest
@testable import StillMe

final class LegacySealTests: XCTestCase {
    private func sampleArchive() -> (Archive, Beneficiary, Beneficiary) {
        let ana = Beneficiary(name: "Ana Torres", relationship: "daughter", personalNote: "Love you")
        let leo = Beneficiary(name: "Leo Torres", relationship: "son")
        var a = Archive()
        a.profile.name = "Michael Torres"
        a.profile.preferredName = "Mike"
        a.legacy.beneficiaries = [ana, leo]
        a.memories = [
            Memory(kind: .story, prompt: "The Bronco", text: "Three years of Sundays."),
            Memory(kind: .story, prompt: "For Ana only", text: "SECRET-FOR-ANA", restrictedTo: [ana.id]),
        ]
        return (a, ana, leo)
    }

    func testSealedFileOpensWithItsCodeInAnyFormat() throws {
        let (archive, ana, _) = sampleArchive()
        let code = LegacySeal.newCode()
        let data = try LegacySeal.seal(LegacyPackage(archive: archive, for: ana), code: code)

        let peek = try LegacySeal.peek(data)
        XCTAssertEqual(peek.fromName, "Mike")
        XCTAssertEqual(peek.forName, "Ana Torres")

        let typed = code.lowercased().replacingOccurrences(of: "-", with: " ")
        let opened = try LegacySeal.open(data, code: typed)
        XCTAssertEqual(opened.recipient, ana)
        XCTAssertEqual(opened.archive.profile.name, "Michael Torres")
    }

    func testWrongCodeIsRejected() throws {
        let (archive, ana, _) = sampleArchive()
        let data = try LegacySeal.seal(LegacyPackage(archive: archive, for: ana), code: LegacySeal.newCode())
        XCTAssertThrowsError(try LegacySeal.open(data, code: "AAAA-BBBB-CCCC-DDDD")) { error in
            XCTAssertEqual(error as? LegacySealError, .wrongCode)
        }
    }

    func testFileHidesContentsWithoutTheCode() throws {
        let (archive, ana, _) = sampleArchive()
        let data = try LegacySeal.seal(LegacyPackage(archive: archive, for: ana), code: LegacySeal.newCode())
        let raw = String(decoding: data, as: UTF8.self)
        XCTAssertFalse(raw.contains("SECRET-FOR-ANA"))
        XCTAssertFalse(raw.contains("Bronco"))
    }

    func testEachPersonOnlyGetsTheirMemories() {
        let (archive, ana, leo) = sampleArchive()
        XCTAssertTrue(LegacyPackage(archive: archive, for: ana).archive.memories.contains { $0.text == "SECRET-FOR-ANA" })
        XCTAssertFalse(LegacyPackage(archive: archive, for: leo).archive.memories.contains { $0.text == "SECRET-FOR-ANA" })
        XCTAssertEqual(LegacyPackage(archive: archive, for: leo).archive.legacy.beneficiaries, [leo])
    }

    func testCodesAreUniqueAndTypable() {
        let codes = Set((0..<200).map { _ in LegacySeal.newCode() })
        XCTAssertEqual(codes.count, 200)
        for code in codes {
            XCTAssertNotNil(code.range(of: "^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$", options: .regularExpression))
        }
    }

    func testNotALegacyFile() {
        XCTAssertThrowsError(try LegacySeal.peek(Data("hello".utf8))) { error in
            XCTAssertEqual(error as? LegacySealError, .notALegacyFile)
        }
    }

    /// Archives saved by the earlier server-based version still load.
    func testOlderArchivesStillDecode() throws {
        let json = """
        {"profile":{"name":"Mike","speakingStyle":"","instructions":"","boundaries":""},
         "memories":[{"id":"1","kind":"story","text":"hi","createdAt":"2026-01-01T00:00:00Z","restrictedTo":[]}],
         "legacy":{"ownerEmail":"m@example.com","checkInIntervalDays":30,"graceDays":14,
                   "executor":{"name":"Rosa","email":"r@example.com"},
                   "beneficiaries":[{"id":"a","name":"Ana","email":"a@example.com","relationship":"daughter"}]}}
        """
        let archive = try JSONDecoder.stillme.decode(Archive.self, from: Data(json.utf8))
        XCTAssertEqual(archive.legacy.beneficiaries.map(\.name), ["Ana"])
        XCTAssertEqual(archive.memories.count, 1)
        XCTAssertTrue(archive.people.isEmpty)
    }
}
