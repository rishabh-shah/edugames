import XCTest

@MainActor
final class EduGamesAppUITests: XCTestCase {
  private let app = XCUIApplication()
  private let defaultFirstName = "Ava"
  private let defaultLastName = "Shah"
  private let defaultAge = 5

  override func setUp() {
    continueAfterFailure = false
    app.launchEnvironment["EDUGAMES_USE_FIXTURES"] = "1"
    app.launchEnvironment["EDUGAMES_RESET_LOCAL_DATA"] = "1"
    app.launchEnvironment["EDUGAMES_PARENT_GATE_TEST_MODE"] = "1"
  }

  func testCreateProfileAndOpenCatalog() {
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    attachScreenshot(named: "profile-picker")

    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["\(defaultFirstName) \(defaultLastName)"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["Age \(defaultAge) • Girl"].waitForExistence(timeout: 5))

    createdProfile.tap()

    XCTAssertTrue(app.buttons["Switch Profile"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["Shape Match Garden"].waitForExistence(timeout: 5))
    attachScreenshot(named: "catalog-view")
  }

  func testCreatedProfilePersistsAcrossRelaunch() {
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))

    app.terminate()
    app.launchEnvironment["EDUGAMES_RESET_LOCAL_DATA"] = "0"
    app.launch()

    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["\(defaultFirstName) \(defaultLastName)"].waitForExistence(timeout: 5))
    attachScreenshot(named: "profile-picker-relaunch")
  }

  func testOpenGameDetailLaunchRuntimeAndExitToCatalog() {
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    createdProfile.tap()

    let catalogCard = app.buttons["catalog-card-shape-match"]
    XCTAssertTrue(catalogCard.waitForExistence(timeout: 5))
    catalogCard.tap()

    let detailView = identifiedElement("game-detail-view")
    XCTAssertTrue(detailView.waitForExistence(timeout: 5))
    attachScreenshot(named: "game-detail")

    let playButton = app.buttons["play-game-shape-match"]
    XCTAssertTrue(playButton.waitForExistence(timeout: 5))
    playButton.tap()

    let runtimeView = identifiedElement("game-runtime-view")
    XCTAssertTrue(runtimeView.waitForExistence(timeout: 5))

    let readyIndicator = identifiedElement("runtime-ready-indicator")
    XCTAssertTrue(readyIndicator.waitForExistence(timeout: 5))
    attachScreenshot(named: "game-runtime")

    let exitButton = app.buttons["exit-runtime-button"]
    XCTAssertTrue(exitButton.waitForExistence(timeout: 5))
    exitButton.tap()

    XCTAssertTrue(identifiedElement("catalog-view").waitForExistence(timeout: 5))
  }

  func testParentZoneUpdatesPlayLimitAndPersistsAcrossRelaunch() {
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let parentZoneButton = app.buttons["open-parent-zone-button"]
    XCTAssertTrue(parentZoneButton.waitForExistence(timeout: 5))
    parentZoneButton.tap()

    let gateView = identifiedElement("parent-gate-view")
    XCTAssertTrue(gateView.waitForExistence(timeout: 5))

    let correctAnswerButton = gateChoice(identifier: "parent-gate-option-12", label: "12")
    XCTAssertTrue(correctAnswerButton.waitForExistence(timeout: 5))
    correctAnswerButton.tap()

    let parentZoneView = identifiedElement("parent-zone-view")
    XCTAssertTrue(parentZoneView.waitForExistence(timeout: 5))

    let fortyFiveMinuteButton = app.buttons["play-limit-45-prof_fixture_01"]
    XCTAssertTrue(fortyFiveMinuteButton.waitForExistence(timeout: 5))
    fortyFiveMinuteButton.tap()

    XCTAssertTrue(app.staticTexts["Current limit: 45 minutes"].waitForExistence(timeout: 5))

    let doneButton = app.buttons["close-parent-zone-button"]
    XCTAssertTrue(doneButton.waitForExistence(timeout: 5))
    doneButton.tap()

    XCTAssertTrue(identifiedElement("profile-picker-view").waitForExistence(timeout: 5))

    app.terminate()
    app.launchEnvironment["EDUGAMES_RESET_LOCAL_DATA"] = "0"
    app.launch()

    XCTAssertTrue(parentZoneButton.waitForExistence(timeout: 5))
    parentZoneButton.tap()
    let relaunchAnswerButton = gateChoice(identifier: "parent-gate-option-12", label: "12")
    XCTAssertTrue(relaunchAnswerButton.waitForExistence(timeout: 5))
    relaunchAnswerButton.tap()

    XCTAssertTrue(parentZoneView.waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["Current limit: 45 minutes"].waitForExistence(timeout: 5))
  }

  func testPlayTimeExpiryReturnsToCatalog() {
    app.launchEnvironment["EDUGAMES_DEBUG_SECONDS_PER_MINUTE"] = "0.1"
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    createdProfile.tap()

    let catalogCard = app.buttons["catalog-card-shape-match"]
    XCTAssertTrue(catalogCard.waitForExistence(timeout: 5))
    catalogCard.tap()

    let playButton = app.buttons["play-game-shape-match"]
    XCTAssertTrue(playButton.waitForExistence(timeout: 5))
    playButton.tap()

    XCTAssertTrue(identifiedElement("game-runtime-view").waitForExistence(timeout: 5))
    XCTAssertTrue(identifiedElement("catalog-view").waitForExistence(timeout: 12))
    XCTAssertTrue(app.staticTexts["Play time is up. Ask a parent to extend time in Parent Zone."].waitForExistence(timeout: 5))
  }

  func testRuntimeReportFlowIsParentGated() {
    app.launch()

    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfile(
      firstName: defaultFirstName,
      lastName: defaultLastName,
      age: defaultAge
    )

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    createdProfile.tap()

    let catalogCard = app.buttons["catalog-card-shape-match"]
    XCTAssertTrue(catalogCard.waitForExistence(timeout: 5))
    catalogCard.tap()

    let playButton = app.buttons["play-game-shape-match"]
    XCTAssertTrue(playButton.waitForExistence(timeout: 5))
    playButton.tap()

    let reportButton = app.buttons["report-problem-button"]
    XCTAssertTrue(reportButton.waitForExistence(timeout: 5))
    reportButton.tap()

    let gateView = identifiedElement("parent-gate-view")
    XCTAssertTrue(gateView.waitForExistence(timeout: 5))

    let correctAnswerButton = gateChoice(identifier: "parent-gate-option-12", label: "12")
    XCTAssertTrue(correctAnswerButton.waitForExistence(timeout: 5))
    correctAnswerButton.tap()

    let reportView = identifiedElement("report-issue-view")
    XCTAssertTrue(reportView.waitForExistence(timeout: 5))

    let submitButton = button(identifier: "submit-report-button", label: "Send Report")
    XCTAssertTrue(submitButton.waitForExistence(timeout: 5))
    submitButton.tap()

    XCTAssertFalse(reportView.waitForExistence(timeout: 2))
    XCTAssertTrue(identifiedElement("game-runtime-view").waitForExistence(timeout: 5))
  }

  private func attachScreenshot(named name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  private func identifiedElement(_ identifier: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: identifier).firstMatch
  }

  private func gateChoice(identifier: String, label: String) -> XCUIElement {
    let identified = identifiedElement(identifier)
    if identified.exists {
      return identified
    }

    return app.buttons[label]
  }

  private func button(identifier: String, label: String) -> XCUIElement {
    let identified = app.buttons[identifier]
    if identified.exists {
      return identified
    }

    return app.buttons[label]
  }

  private func createProfile(
    firstName: String,
    lastName: String,
    age: Int
  ) {
    let createProfileButton = app.buttons["open-create-profile-form"]
    XCTAssertTrue(createProfileButton.waitForExistence(timeout: 5))
    createProfileButton.tap()

    let firstNameField = app.textFields["create-profile-first-name"]
    XCTAssertTrue(firstNameField.waitForExistence(timeout: 5))
    firstNameField.tap()
    firstNameField.typeText(firstName)

    let lastNameField = app.textFields["create-profile-last-name"]
    XCTAssertTrue(lastNameField.waitForExistence(timeout: 5))
    lastNameField.tap()
    lastNameField.typeText(lastName)

    let ageStepper = identifiedElement("create-profile-age")
    XCTAssertTrue(ageStepper.waitForExistence(timeout: 5))

    let incrementsNeeded = max(age - 5, 0)
    if incrementsNeeded > 0 {
      let incrementButton = ageStepper.buttons["Increment"]
      XCTAssertTrue(incrementButton.waitForExistence(timeout: 5))
      for _ in 0..<incrementsNeeded {
        incrementButton.tap()
      }
    }

    let submitButton = app.buttons["submit-create-profile"]
    XCTAssertTrue(submitButton.waitForExistence(timeout: 5))
    XCTAssertTrue(submitButton.isEnabled)
    submitButton.tap()
  }
}
