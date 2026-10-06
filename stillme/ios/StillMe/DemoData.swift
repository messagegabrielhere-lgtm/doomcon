#if DEBUG
import Foundation

/// Sample content for screenshots and previews. Debug builds only; launch with
/// `-StillMeDemo 1`. Everyone here is fictional.
@MainActor
enum DemoData {
    static func seed(archive store: ArchiveStore, recipient: RecipientStore) {
        let ana = Beneficiary(name: "Ana Torres", email: "ana@example.com", relationship: "daughter",
                              personalNote: "You were the best thing I ever made. Go easy on yourself, kiddo.")
        let leo = Beneficiary(name: "Leo Torres", email: "leo@example.com", relationship: "son")
        let day: TimeInterval = 86_400
        func ago(_ days: Double) -> Date { Date.now.addingTimeInterval(-days * day) }

        var a = Archive()
        a.profile = Profile(
            name: "Michael Torres", preferredName: "Mike", birthYear: 1961, hometown: "San Antonio, Texas",
            speakingStyle: "Short sentences. Calls everyone 'kiddo'. Dad jokes, then laughs at them himself. Says 'listen' before anything important. Texts in all lowercase, no emoji except the thumbs up.",
            instructions: "Remind my kids I was proud of them, especially when they doubt themselves. Never pretend I'm still alive.",
            boundaries: "Don't get into my brother's divorce."
        )
        a.legacy = LegacySettings(ownerEmail: "mike@example.com", checkInIntervalDays: 30, graceDays: 14,
                                  executor: Executor(name: "Rosa Torres", email: "rosa@example.com"),
                                  beneficiaries: [ana, leo])
        a.people = [
            Person(name: "Ana Torres", relationship: "daughter", iCallThem: "Kiddo, Banana", theyCallMe: "Dad, Pops",
                   notes: "Stubborn like her mother, funny like me. Taught her to drive in the H-E-B parking lot. She cried at her graduation and pretended it was allergies.",
                   beneficiaryId: ana.id),
            Person(name: "Leo Torres", relationship: "son", iCallThem: "Champ", theyCallMe: "Dad",
                   notes: "Quiet one. Notices everything. We fixed up the '72 Bronco together every Sunday for three years.",
                   beneficiaryId: leo.id),
            Person(name: "Rosa Torres", relationship: "wife of 34 years", iCallThem: "Rosie", theyCallMe: "Miguel when she's mad",
                   notes: "Met her at a quinceañera in 1986. She out-danced me and has not let me forget it."),
            Person(name: "Carmen Torres", relationship: "mother", notes: "Made tamales every Christmas Eve. Ran the house like a general.",
                   status: "passed away 2015"),
        ]
        a.timeline = [
            LifeEvent(year: 1961, month: 4, title: "Born in San Antonio"),
            LifeEvent(year: 1983, title: "First job at the Alamo Cement plant"),
            LifeEvent(year: 1986, month: 6, title: "Met Rosa at a quinceañera"),
            LifeEvent(year: 1989, title: "Married Rosa"),
            LifeEvent(year: 1992, month: 3, title: "Ana born"),
            LifeEvent(year: 1995, month: 9, title: "Leo born"),
            LifeEvent(year: 2015, title: "Mom passed away"),
        ]
        a.memories = [
            Memory(kind: .interview, prompt: "Where did you grow up, and what did it smell and sound like?",
                   text: "South side of San Antonio. Smelled like mesquite smoke and cut grass. You could hear the trains at night and my mom yelling for us to come in for dinner.", createdAt: ago(20)),
            Memory(kind: .interview, prompt: "Describe your mother the way you'd describe her to a stranger.",
                   text: "Five foot nothing and nobody argued with her. She could feed twenty people on what looked like nothing.", createdAt: ago(19)),
            Memory(kind: .interview, prompt: "What advice would you give someone on the worst day of their life?",
                   text: "Listen. Eat something. Call somebody who loves you. Tomorrow you don't have to fix it, you just have to get through it.", createdAt: ago(12)),
            Memory(kind: .interview, prompt: "What are your catchphrases and sayings? Write them exactly.",
                   text: "\"Listen, kiddo.\" \"Measure twice, cut once, swear three times.\" \"We'll figure it out.\"", createdAt: ago(10)),
            Memory(kind: .story, prompt: "The Bronco",
                   text: "Leo and I bought a dead 1972 Bronco for four hundred dollars. Took three years of Sundays. The day it started, he didn't say anything, just grinned for about an hour.", createdAt: ago(8)),
            Memory(kind: .reply, prompt: "I got the job!!", text: "thats my kiddo. never doubted it 👍", createdAt: ago(5)),
            Memory(kind: .reply, prompt: "I'm scared about the surgery tomorrow.",
                   text: "listen. you're allowed to be scared. call me after, i'll be right here", createdAt: ago(5)),
            Memory(kind: .reply, prompt: "Good night", text: "night kiddo. love you", createdAt: ago(4)),
            Memory(kind: .story, prompt: "For Ana only",
                   text: "Your mom and I almost named you Carmen. I'm glad we didn't. You were never anybody but you.",
                   createdAt: ago(3), restrictedTo: [ana.id]),
        ]
        store.archive = a
        store.persist()

        recipient.loadDemo(
            grant: LegacyGrant(name: "Mike", fullName: "Michael Torres", beneficiaryName: "Ana",
                               relationship: "daughter", personalNote: ana.personalNote),
            conversation: [
                ChatMessage(role: .user, content: "I got the job. The one in Lisbon."),
                ChatMessage(role: .assistant, content: "thats my kiddo. never doubted it. listen, you send your mom a picture of the ocean the first day, she'll pretend she isn't crying"),
                ChatMessage(role: .user, content: "I wish you could see it."),
                ChatMessage(role: .assistant, content: "me too, banana. go eat something good and call your brother"),
            ]
        )
    }
}
#endif
