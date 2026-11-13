# Troubleshooting

Start with the symptom you see on the page. The **Fin Chat Conversations** tab shows each chat's status and status reason, which usually names the problem.

## The chat says "Fin rejected the request (HTTP 401)" or "(HTTP 403)"

The Fin API key is missing, mistyped, or revoked.

- Check **External Credentials, Fin Agent API, FinAgent principal**: the parameter must be named exactly `ApiKey`.
- Generate a new key in Fin if in doubt, and paste it again.
- HTTP 404 instead usually means the wrong region: see [CONFIGURE-FIN.md, Region](CONFIGURE-FIN.md#4-region).

## The chat says "Fin did not acknowledge the message"

The callout itself failed.

- **"We couldn't access the credential(s)"** in debug logs: the running user (for example the site guest user) lacks the `Fin_Agent_API-FinAgent` principal or Read on User External Credential. Assign **Fin Card Chat Guest**.
- Check that the **Fin Agent API** named credential is enabled (Callout Status: Enabled) and has the right URL.

## Fin answers in Intercom, but nothing appears on the page

Salesforce never received Fin's webhook, or rejected it.

1. Run the `curl` check from [INSTALL.md, step 8](INSTALL.md#8-point-fins-webhook-at-your-site). You must get **401 Invalid webhook signature**.
   - **403 "You do not have access to the Apex class named: FinWebhookResource":** assign **Fin Card Chat Guest** to the site guest user.
   - **404 or an HTML page:** turn on **Allow guest users to access public APIs** in Experience Builder, publish, and make sure the guest user has **Fin Card Chat Guest** (it grants `FinWebhookResource`).
   - **Wrong path:** the URL needs the site prefix, for example `/support/services/apexrest/fin/webhook`.
2. Check that the webhook URL in Fin is exactly that URL.
3. Check that **Fin Agent Settings, Webhook Secret** matches Fin's signing secret exactly (no spaces). A mismatch returns 401 to Fin, and nothing is stored.
4. Is another app using the workspace's single webhook URL? See "Sharing one Fin workspace" in [CONFIGURE-FIN.md](CONFIGURE-FIN.md#sharing-one-fin-workspace).

The chat waits up to a minute per answer (the server marks a turn as timed out after 45 seconds), then shows "Fin is taking longer than usual."

## Guests see "You do not have access to the Apex class" or the component does not load

- Assign **Fin Card Chat Guest** to the site guest user, then republish.
- Make the page public (page properties, Page Access) and turn on **Public can access the site**.

## Answers appear, but no cards

- Open **Fin Card Studio, Match tester** and paste the visitor message and Fin's reply. If nothing matches, adjust the trigger keywords or **Source URL contains**.
- The card must be **Active**.
- **Match on = Visitor message** ignores Fin's wording; **Fin's reply** ignores the visitor's wording.
- A card shown earlier in the same conversation is not repeated. Start a new chat to retest.
- The component's **Maximum cards per answer** can be lower than you expect.

## Cards appear without images

The image host is not a CSP Trusted Site with img-src. Add it in **Setup, CSP Trusted Sites**, then reload. Check the browser console for `Refused to load the image` messages.

## Fin Card Studio is missing or blank

- Assign **Fin Card Studio Admin** (it grants the app).
- The UI Bundle must be built before deployment: run `scripts/setup.sh` without `--skip-build`, or `npm ci && npm run build` in the studio folder, then deploy again.
- Deployment error `Unknown type name 'UIBundle'` or similar: your org or CLI does not support UI Bundles. Update the CLI (`sf update`), or deploy without `uiBundles/` and `applications/`, and manage cards from the **Fin UI Cards** tab.

## "No such column 'Subtitle__c'" or "fields being inaccessible" on Fin_UI_Card__c

The user lacks field access to the card fields, which is granted only by **Fin Card Studio Admin**, even for System Administrators. Assign it and reload the studio.

## "Add starter cards" says no starter card set is installed

Deploy `sample-data/stargrid` (`scripts/setup.sh -o my-org --sample`). The core package intentionally ships without sample content.

## Draft with AI fails

- **"The Models API could not draft a card (HTTP ...)"**: turn on Einstein generative AI (Setup, Einstein Setup), and check that the model in **Fin Agent Settings, Card Model** exists in your org (or leave it blank).
- **Drafts have no links:** set **Fin Agent Settings, Site Base URL**. Links outside that site are always dropped.

## Deployment fails

| Error | Fix |
| --- | --- |
| `ExternalCredential` or `NamedCredential` errors | Make sure your org supports the newer named credential model (Winter '23 or later). |
| `Fin_Request_Callback` flow errors | The flow creates a Case. Make sure the deploying user can create Cases and that Case is enabled. |
| Apex test failures in `FinCardGeneratorTest` | Usually a required custom field or validation rule on Product2 in your org. Add the field to the test data, or deploy with `--test-level NoTestRun` in a sandbox or scratch org. |
| Validation reports 0 tests run | Some demo orgs skip tests on check-only deploys. Deploy, then run `sf apex run test -o my-org -n FinCardGeneratorTest -n FinCardMatcherTest -n FinCardStudioResourceTest -n FinChatTest -w 20`. |
| `Database.query(String, AccessLevel)` not found | The org's API version is below 67.0. Use a current org. |

## Collecting details for a bug report

1. Setup, Debug Logs: add a trace flag for the site guest user (or your user), then reproduce the issue.
2. Note the conversation's **Status** and **Status Reason** from the Fin Chat Conversations tab.
3. Open an issue on the GitHub repo with the steps, the status, and the relevant log lines. **Remove API keys, secrets, and org IDs first.**
