# Rotate Secrets Runbook

## Purpose

Replace credentials safely after suspected exposure, scheduled rotation, or environment changes.

## Typical Secrets

- GitHub OAuth credentials for admin access
- API and worker environment secrets
- Cloud storage credentials
- Deployment platform tokens
- Apple signing or submission credentials

## Steps

1. Inventory the secret being rotated, where it is stored, and every service that consumes it.
2. Create the replacement credential before revoking the current one, unless the incident requires immediate revocation.
3. Update the secret in each managed environment and secret store.
4. Redeploy or restart the affected services so they pick up the new value.
5. Verify the dependent flow still works, such as admin sign-in, asset access, deploy hooks, or submission tooling.
6. Revoke the old credential.
7. Record the rotation date, owner, affected systems, and whether the change was routine or incident-driven.

## If Exposure Is Suspected

- Treat the event as a security incident.
- Reduce the blast radius first by revoking or scoping access.
- Review audit logs and recent deploy activity.
- Follow `SECURITY.md` for reporting and triage expectations.
