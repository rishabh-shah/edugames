# Restore Database Runbook

## Purpose

Restore backend data after corruption, accidental deletion, or a failed migration.

## Scope

This runbook applies to backend-managed data only. Local game save state is device-local in MVP and is not restored from the server.

## Use When

- Production data is lost or corrupted
- A schema or migration issue leaves the service unusable
- Recovery to a known timestamp is safer than forward repair

## Steps

1. Declare the incident and stop write traffic if continuing writes would make recovery harder.
2. Identify the target restore point and the backup or snapshot to use.
3. Restore into an isolated environment first.
4. Validate schema version, row counts, critical tables, and basic API reads in the isolated restore.
5. Get maintainer approval for cutover.
6. Restore or promote the validated database into the active environment.
7. Run smoke checks for installation, profiles, catalog, launch sessions, reports, and admin access.
8. Record the restore source, restore point, approver, and any data lost between the last good backup and the incident.

## Stop Conditions

Do not cut over if the restored data does not match the expected schema or if smoke checks fail. Continue incident handling and prepare a narrower recovery plan.
