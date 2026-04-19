# Security Policy

## Supported Line

During bootstrap, the supported line is `main`. Older commits, abandoned branches, and draft experiments should be treated as unsupported unless maintainers say otherwise.

## How to Report a Vulnerability

Do not open a public issue for suspected security problems.

Use GitHub private vulnerability reporting for this repository if it is enabled. If it is not available, contact the maintainers through a private channel and share the report only with people who need it to triage the issue.

Include:

- affected area or file path
- impact and severity as you understand it
- reproduction steps or proof of concept
- any prerequisites, logs, or screenshots needed to verify the issue

## High-Priority Areas

Please report issues involving:

- parental gate bypass
- time-limit bypass
- game disable or kill-switch failure
- bundle verification or runtime sandbox escape
- auth, secret handling, or admin access
- child privacy or unintended data collection

## Response Expectations

Maintainers will triage reports as quickly as practical. During bootstrap, response timing is best-effort, but reporters should receive an acknowledgment before details are disclosed more widely.

## Disclosure

Please do not publish exploit details until maintainers have had a reasonable chance to investigate, mitigate, and coordinate any needed release or disablement work.
