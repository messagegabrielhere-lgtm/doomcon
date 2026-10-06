import AVFoundation
import Observation
import Speech

/// Live speech-to-text so people can tell stories out loud. Transcription runs
/// on-device when the phone supports it; audio is never stored or uploaded.
@MainActor
@Observable
final class SpeechRecorder {
    private(set) var transcript = ""
    private(set) var isRecording = false
    var error: String?

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private let recognizer = SFSpeechRecognizer()
    /// Text recognized in earlier segments (recognition restarts after pauses).
    private var committed = ""

    func toggle() async {
        isRecording ? stop() : await start()
    }

    func start() async {
        error = nil
        guard await Self.authorize() else {
            error = "Allow microphone and speech recognition in Settings to record."
            return
        }
        guard let recognizer, recognizer.isAvailable else {
            error = "Speech recognition isn't available right now."
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.addsPunctuation = true
            if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
            self.request = request

            let input = engine.inputNode
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0), block: Self.tap(into: request))
            engine.prepare()
            try engine.start()
            isRecording = true

            committed = transcript.isEmpty ? "" : transcript + " "
            task = recognizer.recognitionTask(with: request, resultHandler: Self.handler(for: self))
        } catch {
            self.error = error.localizedDescription
            stop()
        }
    }

    func stop() {
        guard isRecording else { return }
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.finish()
        request = nil
        task = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func reset() {
        stop()
        transcript = ""
        committed = ""
    }

    // These callbacks run on audio/speech threads, so they're built outside the
    // main actor and hop back explicitly.
    nonisolated private static func tap(into request: SFSpeechAudioBufferRecognitionRequest) -> AVAudioNodeTapBlock {
        { buffer, _ in request.append(buffer) }
    }

    nonisolated private static func handler(for recorder: SpeechRecorder) -> (SFSpeechRecognitionResult?, Error?) -> Void {
        { [weak recorder] result, error in
            let text = result?.bestTranscription.formattedString
            let done = error != nil || (result?.isFinal ?? false)
            Task { @MainActor in
                guard let recorder else { return }
                recorder.receive(text: text, done: done)
            }
        }
    }

    private func receive(text: String?, done: Bool) {
        if let text { transcript = committed + text }
        if done { stop() }
    }

    nonisolated private static func authorize() async -> Bool {
        let speech = await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        guard speech else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }
}
