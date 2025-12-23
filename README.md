# VA Starter Track Proposal Tracker (Railway)

Tracks SuiteDash project updates (webhook payload) and renders a simple, client-specific “profile page” by `clientUID`.

## What this is

- **SuiteDash → Railway**: SuiteDash sends a **Project Updated** payload to a Railway webhook endpoint.
- **Railway stores a small record** keyed by `client.uid` (the `{{clientUID}}` used in your proposal).
- **Client clicks “View your profile page”** in the SuiteDash proposal and lands on a Railway-rendered page:
  - `/va-starter-track/c/:clientUID/overview`

## Endpoints

- **Health**
  - `GET /va-starter-track/health`

- **SuiteDash webhook receiver**
  - `POST /va-starter-track/webhook`
  - Expects SuiteDash payload including:
    - `client.uid`
    - `project_custom_fields["8b2f855a-6e87-4a1b-8623-dd28eced4373"]` (Nationality Est CF)

- **Client render page**
  - `GET /va-starter-track/c/:clientUID/overview`

## Required Custom Field

This repo currently reads only one SuiteDash Project Custom Field:

- **CF title**: `SD Account Profile Nationality Est [SOP-10105]`
- **CF id**: `8b2f855a-6e87-4a1b-8623-dd28eced4373`
- **Expected value**: a direct **image URL** (string)

## SuiteDash setup

### Automation trigger

Use an automation that fires **when the project is updated** (SuiteDash only sends on update, per your screenshot).

### Destination (Railway webhook endpoint)

Set SuiteDash to send the payload to:

- `https://va-starter-track-proposal-tracker-production.up.railway.app/va-starter-track/webhook`

### Proposal link (client experience)

In the proposal, use:

- `https://va-starter-track-proposal-tracker-production.up.railway.app/va-starter-track/c/{{clientUID}}/overview`

## Local development

### Install

```bash
npm install
