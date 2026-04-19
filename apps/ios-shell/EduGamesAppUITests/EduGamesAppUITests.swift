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

  private func attachScreenshot(named name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
