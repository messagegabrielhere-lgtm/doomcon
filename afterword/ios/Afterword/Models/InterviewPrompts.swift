import Foundation

struct InterviewTopic: Identifiable {
    let id: String
    let title: String
    let symbol: String
    let questions: [String]
}

enum InterviewPrompts {
    static let topics: [InterviewTopic] = [
        InterviewTopic(id: "roots", title: "Roots", symbol: "house", questions: [
            "Where did you grow up, and what did it smell and sound like?",
            "Describe your parents the way you'd describe them to a stranger.",
            "What's a family story that gets told at every gathering?",
            "What did you want to be when you were ten?",
            "Who was your best friend as a kid, and what did you get up to?",
            "What's the first thing you remember?",
        ]),
        InterviewTopic(id: "turning", title: "Turning points", symbol: "arrow.triangle.branch", questions: [
            "What decision changed the direction of your life the most?",
            "Tell me about a time you failed and what came after.",
            "When did you feel most proud of yourself?",
            "What's something you were wrong about for a long time?",
            "Describe the hardest year you've lived through.",
        ]),
        InterviewTopic(id: "love", title: "Love & people", symbol: "heart", questions: [
            "How did you meet the people who matter most to you?",
            "What do you want each person you love to know you thought of them?",
            "What does a good friend do that most people don't?",
            "Who do you owe an apology or a thank-you to?",
            "What did you learn about love that you wish you'd known earlier?",
        ]),
        InterviewTopic(id: "beliefs", title: "What you believe", symbol: "sparkles", questions: [
            "What do you believe happens after we die?",
            "What makes a life well lived?",
            "What would you fight for?",
            "What's a rule you live by that you made up yourself?",
            "What scares you, honestly?",
        ]),
        InterviewTopic(id: "advice", title: "Advice", symbol: "lightbulb", questions: [
            "What advice would you give someone on the worst day of their life?",
            "What do you want your loved ones to do when they miss you?",
            "What should someone know about money, work, or ambition?",
            "What would you tell your younger self?",
            "How do you want people to handle disagreements in the family after you're gone?",
        ]),
        InterviewTopic(id: "you", title: "Just you", symbol: "face.smiling", questions: [
            "What always makes you laugh?",
            "Describe a perfect ordinary day.",
            "What are your strong opinions about food, music, or movies?",
            "What do people misunderstand about you?",
            "What are your catchphrases, nicknames, and inside jokes?",
            "How do you comfort someone who's crying?",
        ]),
    ]
}
