import XCTest

@MainActor
final class EduGamesAppUITests: XCTestCase {
  private let app = XCUIApplication()

  override func setUp() {
    continueAfterFailure = false
    app.launchEnvironment["EDUGAMES_USE_FIXTURES"] = "1"
    app.launchEnvironment["EDUGAMES_RESET_LOCAL_DATA"] = "1"
  }

  func testCreateProfileAndOpenCatalog() {
    app.launch()

    let addProfileButton = app.buttons["add-profile-preschool"]
    XCTAssertTrue(addProfileButton.waitForExistence(timeout: 5))
    attachScreenshot(named: "profile-picker")

    addProfileButton.tap()

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))

    createdProfile.tap()

    XCTAssertTrue(app.buttons["Switch Profile"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.staticTexts["Shape Match Garden"].waitForExistence(timeout: 5))
    attachScreenshot(named: "catalog-view")
  }

  func testCreatedProfilePersistsAcrossRelaunch() {
    app.launch()

    let addProfileButton = app.buttons["add-profile-preschool"]
    XCTAssertTrue(addProfileButton.waitForExistence(timeout: 5))
    addProfileButton.tap()

    let createdProfile = app.buttons["profile-card-prof_fixture_01"]
    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))

    app.terminate()
    app.launchEnvironment["EDUGAMES_RESET_LOCAL_DATA"] = "0"
    app.launch()

    XCTAssertTrue(createdProfile.waitForExistence(timeout: 5))
    attachScreenshot(named: "profile-picker-relaunch")
  }

  func testOpenGameDetailLaunchRuntimeAndExitToCatalog() {
    app.launch()

    let addProfileButton = app.buttons["add-profile-preschool"]
    XCTAssertTrue(addProfileButton.waitForExistence(timeout: 5))
    addProfileButton.tap()

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

  private func attachScreenshot(named name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  private func identifiedElement(_ identifier: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: identifier).firstMatch
  }
}
