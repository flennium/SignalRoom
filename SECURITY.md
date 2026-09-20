# Security policy

## Supported versions

SignalRoom is pre-1.0 software. Security fixes are applied to the latest release only.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature for this repository. Do not open a public issue for a vulnerability that has not been fixed.

Include the affected version, reproduction steps, impact, and any suggested mitigation. You can expect an acknowledgement within seven days.

## Deployment boundary

SignalRoom is designed for trusted, temporary groups. A room key is a bearer secret: anyone who has it can join that room. Deploy behind TLS, use an unguessable room key, configure allowed browser origins when the web client is hosted separately, and restart the service to clear all in-memory data.
