# Configure your Fin workspace

Everything here happens in your Intercom workspace. Official reference: [Fin Agent API setup](https://developers.intercom.com/docs/guides/fin-agent-api/setup) and [overview](https://developers.intercom.com/docs/guides/fin-agent-api).

## 1. Get Fin Agent API access

In Intercom, go to **Settings, Integrations, Fin Agent API** and request access with a short description of your use case. Once access is granted, **Fin Agent API** appears under **Fin AI Agent, Deploy**.

## 2. Generate an API key

1. **Fin AI Agent, Deploy, Fin Agent API**.
2. **Generate API key**, then **Manage API key**, and copy it.
3. Paste it into Salesforce on the `FinAgent` principal of the **Fin Agent API** external credential, as the `ApiKey` parameter ([INSTALL.md, step 4](INSTALL.md#4-add-your-fin-api-key)).

The key only has `write_conversations` and `read_write_users` scopes, but treat it like a password:

- Never paste it into code, a commit, Slack, or a screenshot.
- Each person or org installing this project should generate **their own** key.
- If a key leaks, generate a new one in Fin and update the principal in Salesforce.

## 3. Set the webhook

Fin answers asynchronously: after Salesforce sends a question to `/fin/start` or `/fin/reply`, Fin posts its answer to your webhook.

1. On the same **Fin Agent API** page, under **Webhooks**, enter your Experience site webhook URL:

   ```
   https://<your-site-domain>/<site-prefix>/services/apexrest/fin/webhook
   ```

   For example `https://acme.my.site.com/support/services/apexrest/fin/webhook`. See [INSTALL.md, step 8](INSTALL.md#8-point-fins-webhook-at-your-site) for how to find and test it.

2. Save. Fin generates a **signing secret**. Copy it into **Salesforce Setup, Custom Settings, Fin Agent Settings, Manage, Webhook Secret**.

Salesforce verifies the `X-Fin-Agent-API-Webhook-Signature` header (HMAC-SHA256 of the raw body) on every request and rejects anything unsigned or mis-signed with HTTP 401.

### Events used

| Event | What Salesforce does |
| --- | --- |
| `fin_replied` | Stores Fin's message, its cited sources, and the cards that match. |
| `fin_status_updated` | Updates the conversation status: `thinking`, `awaiting_user_reply` (turn done), `escalated`, `resolved`, `complete`. |

Other events (for example `csat_requested`) are acknowledged and ignored. So are events for conversations this org did not start: every conversation the component starts has an ID beginning with `sf-exp-`.

### Sharing one Fin workspace

Fin has **one Agent API webhook URL per workspace**. If another integration already uses it (a mobile app, a bridge server, another org), you have two options:

- **Use a separate Fin workspace** (or a test workspace) for this demo. This is the simplest choice.
- **Forward by conversation ID.** Point Fin's webhook at a small relay that forwards each event, with the original body and signature header unchanged, to every subscriber. Each subscriber ignores conversation IDs it does not own. This Salesforce receiver already ignores anything that does not start with `sf-exp-`, so a relay can safely send every event here.

## 4. Region

Salesforce calls `https://api.intercom.io` by default (US-hosted workspaces). For EU or Australian workspaces, edit the **Fin Agent API** named credential URL in Salesforce to `https://api.eu.intercom.io` or `https://api.au.intercom.io`.

The component uses Intercom API version **2.16** (`Intercom-Version` header), which sends intermediate `replying` events and a final `awaiting_user_reply` status.

## 5. Environment (optional)

If your workspace uses Fin environments (for example a staging environment with different content or guidance), put the environment name in **Fin Agent Settings, Environment**. It is sent on `/fin/start`. Leave it blank for the default.

## 6. Content and behavior

Cards only appear next to Fin's answers, so Fin needs content to answer from:

- Add help center articles, public websites, snippets, or PDFs as Fin content sources.
- Cards can match the URLs Fin cites. If your guide cards link to `https://www.acme.com/support/reset-router`, set the card's **Source URL contains** to `reset-router`, and the card shows whenever Fin cites that page.
- Using the StarGrid sample? To make Fin answer about StarGrid, add `https://stargrid-service-demo-721e32a56364.herokuapp.com/knowledge/` as a public website source.

**Escalation.** When Fin escalates, the chat shows "Fin has handed this conversation to our support team." Route the escalated conversation to people with your normal Intercom workflows. Visitors appear in Intercom as users named "Experience site visitor", with IDs `sf-exp-visitor-<hash>` for guests and `sf-user-<Salesforce user ID>` for logged-in users.
