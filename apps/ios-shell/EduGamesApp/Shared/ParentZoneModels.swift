import Foundation

enum PlayTimeLimit: Int, CaseIterable, Codable, Equatable, Sendable {
  case minutes15 = 15
  case minutes30 = 30
  case minutes45 = 45
  case minutes60 = 60

  var minutes: Int { rawValue }

  var shortLabel: String {
    "\(minutes) min"
  }

  var durationLabel: String {
    "\(minutes) minutes"
  }
}

struct ParentPlayTimeSettings: Codable, Equatable, Sendable {
  let profileId: String
  var playTimeLimit: PlayTimeLimit
}

struct ParentGateChallenge: Equatable, Sendable {
  let prompt: String
  let answer: Int
  let choices: [Int]
}

protocol ParentGateChallengeFactory {
  func makeChallenge() -> ParentGateChallenge
}

struct ArithmeticParentGateChallengeFactory: ParentGateChallengeFactory {
  func makeChallenge() -> ParentGateChallenge {
    let left = Int.random(in: 4 ... 8)
    let right = Int.random(in: 3 ... 7)
    let answer = left + right
    let choices = [answer - 1, answer, answer + 1].shuffled()

    return ParentGateChallenge(
      prompt: "For parents: what is \(left) + \(right)?",
      answer: answer,
      choices: choices
    )
  }
}

enum PlayTimeWarningState: Equatable, Sendable {
  case none
  case fiveMinutesRemaining
  case oneMinuteRemaining
}

struct ActivePlayTimeSession: Equatable, Sendable {
  let baseLimit: PlayTimeLimit
  var totalAllocatedSeconds: Int
  var consumedSeconds: Int
  var warningState: PlayTimeWarningState

  init(baseLimit: PlayTimeLimit) {
    self.baseLimit = baseLimit
    totalAllocatedSeconds = baseLimit.minutes * 60
    consumedSeconds = 0
    warningState = Self.warningState(for: totalAllocatedSeconds)
  }

  var remainingSeconds: Int {
    max(0, totalAllocatedSeconds - consumedSeconds)
  }

  var remainingLabel: String {
    let minutes = remainingSeconds / 60
    let seconds = remainingSeconds % 60
    return String(format: "%02d:%02d left", minutes, seconds)
  }

  var totalAllocatedMinutes: Int {
    totalAllocatedSeconds / 60
  }

  mutating func advance(by seconds: Int) -> Bool {
    consumedSeconds = min(totalAllocatedSeconds, consumedSeconds + max(0, seconds))
    warningState = Self.warningState(for: remainingSeconds)
    return remainingSeconds == 0
  }

  mutating func extend(by limit: PlayTimeLimit) {
    totalAllocatedSeconds += limit.minutes * 60
    warningState = Self.warningState(for: remainingSeconds)
  }

  private static func warningState(for remainingSeconds: Int) -> PlayTimeWarningState {
    switch remainingSeconds {
    case ...60:
      return .oneMinuteRemaining
    case ...300:
      return .fiveMinutesRemaining
    default:
      return .none
    }
  }
}
