# ADR 0001: HTML5 Games in a Native Shell

- Status: Accepted
- Date: 2026-04-19
- Source: `docs/implementation-decisions.md`

## Context

EduGames MVP is an iPad-first, curated platform for reviewed games. The product needs native controls for downloads, profiles, parental controls, offline launch, and policy enforcement, while still letting game teams ship standard web content.

## Decision

Run reviewed HTML5 games inside the native iOS shell by loading locally stored bundles in `WKWebView`.

For MVP:

- Games are packaged as reviewed, immutable bundles.
- Games communicate with the shell only through the platform bridge.
- Games do not get direct native API access.
- Games do not open arbitrary remote network connections or external links.
- The shell owns bundle verification, runtime policy, and exit behavior.

## Consequences

- Contributed games target a WebKit-compatible HTML5 runtime, not custom native integrations.
- Native policy features such as parental gate, time limits, and disablement stay in the shell.
- Runtime safety checks can be enforced in one place before public launch.
- If the project later needs a different runtime model, it should be captured in a new ADR.
