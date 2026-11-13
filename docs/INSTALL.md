# Install Fin Card Chat and Fin Card Studio

This guide takes a Salesforce org from nothing to a working Fin chat with cards on an Experience Cloud page. Follow the steps in order. Steps 1 to 3 are automated by `scripts/setup.sh`; steps 4 to 10 happen in Setup, Experience Builder, and your Fin workspace.

| Step | Where | Time |
| --- | --- | --- |
| 1. Check prerequisites | | 5 min |
| 2. Get the code | Terminal | 1 min |
| 3. Build and deploy | Terminal | 5 min |
| 4. Add your Fin API key | Salesforce Setup | 3 min |
| 5. Create Fin Agent Settings | Salesforce Setup | 3 min |
| 6. Grant access | Salesforce Setup | 3 min |
| 7. Add the chat to your Experience site | Experience Builder | 5 min |
| 8. Point Fin's webhook at your site | Fin workspace | 3 min |
| 9. Create cards | Fin Card Studio | 5 min |
| 10. Test end to end | Experience site | 2 min |

---

## 1. Prerequisites

**Salesforce org**

- Experience Cloud enabled with at least one site (any template that supports Lightning components, for example Build Your Own (LWR) or Customer Service). A Salesforce Demo Org (SDO) works well.
- UI Bundles available. Fin Card Studio is a UI Bundle (`uiBundles` metadata, API 67.0). If your org does not support UI Bundles, deploy everything except `force-app/main/default/uiBundles` and `force-app/main/default/applications`; the chat still works and you manage cards from the **Fin UI Cards** tab instead.
- System Administrator access.
- Optional: Einstein generative AI turned on (Setup, Einstein Setup), for the **Draft with AI** button in Fin Card Studio. Everything else works without it.
- Optional: a Platform Cache org partition named `FinCards`. Without it, active cards are queried once per transaction instead of cached.

**Fin (Intercom) workspace**

- Fin AI Agent with **Fin Agent API** access, plus permission to generate an API key and set the Agent API webhook. See [CONFIGURE-FIN.md](CONFIGURE-FIN.md).
- Content in Fin (help center, websites, or snippets) so Fin has something to answer from.

**Your computer**

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`), version 2.x.
- [Node.js](https://nodejs.org) 22 or later, used to build Fin Card Studio.
- Git.

## 2. Get the code

```sh
git clone https://github.com/sfdc-brendan/fin-card-chat.git
cd fin-card-chat
sf org login web --alias my-org          # skip if the org is already authorized
```

Use `--instance-url https://test.salesforce.com` for a sandbox, or your My Domain URL.

## 3. Build and deploy

The script builds Fin Card Studio, deploys the metadata, and assigns permission sets.

```sh
scripts/setup.sh -o my-org --seed --site "My Site"
```

| Option | Meaning |
| --- | --- |
| `-o my-org` | Target org alias (required). |
| `--sample` | Also deploy `sample-data/stargrid` (StarGrid starter cards, image CSP site). |
| `--seed` | Deploy the sample and load its starter cards. Leave this off to start with an empty card library. |
| `--site "My Site"` | Assign `Fin_Card_Chat_Guest` to that Experience site's guest user. Use the site name from Setup, Digital Experiences, All Sites. |
| `--dry-run` | Validate and run Apex tests without saving anything. |

<details>
<summary>Prefer to run the commands yourself?</summary>

```sh
cd force-app/main/default/uiBundles/FinCardStudio
npm ci && npm run build
cd -
sf project deploy start --source-dir force-app --target-org my-org
sf project deploy start --source-dir sample-data/stargrid --target-org my-org   # optional
sf org assign permset --name Fin_Card_Studio_Admin --target-org my-org
```

Fin Card Studio's `dist/` folder must exist before you deploy; the UI Bundle deploys the built files.
</details>

## 4. Add your Fin API key

The key is stored on an external credential principal, encrypted by Salesforce. It never appears in metadata, Apex, or the browser. **Do not commit your key to Git.**

1. Generate a key in Fin: **Fin AI Agent, Deploy, Fin Agent API** (details in [CONFIGURE-FIN.md](CONFIGURE-FIN.md)).
2. In Salesforce: **Setup, Named Credentials, External Credentials tab, Fin Agent API**.
3. Under **Principals**, find **FinAgent** and choose **Edit** from its row menu.
4. Under **Authentication Parameters**, choose **Add**:
   - **Name:** `ApiKey` (exact spelling; the credential sends `Authorization: Bearer {ApiKey}`)
   - **Value:** your Fin Agent API key
5. **Save**.

**Region.** The named credential points to the US API (`https://api.intercom.io`). If your Fin workspace is hosted in the EU or Australia, open **Named Credentials tab, Fin Agent API, Edit** and change the URL to `https://api.eu.intercom.io` or `https://api.au.intercom.io`.

## 5. Create Fin Agent Settings

**Setup, Custom Settings, Fin Agent Settings, Manage, New** (the org-default row at the top).

| Field | Required | Value |
| --- | --- | --- |
| Webhook Secret | Yes | The signing secret from Fin's Agent API webhook settings (step 8). You can save now and paste it after step 8. |
| Environment | No | A Fin environment name, if your workspace uses one. Leave blank for the default. |
| Brand Name | No | Your company name, for example `Acme`. Used by AI card drafts. |
| Site Base URL | No | Your public website, for example `https://www.acme.com`. AI-drafted card links and images must stay on this site. Leave blank to block AI-drafted links. |
| Max Cards Per Turn | No | 1 to 6. Blank means 5. |
| Card Size | No | `standard` or `compact`. Blank means standard. Also settable on the studio's Display page. |
| Card Model | No | Models API model for AI drafts. Blank uses `sfdc_ai__DefaultBedrockAnthropicClaude46Sonnet`. |

If you deployed the StarGrid sample, Brand Name and Site Base URL fall back to StarGrid's values when blank.

## 6. Grant access

**Admins and card authors:** assign **Fin Card Studio Admin** (the setup script assigns it to you). It grants the Fin Card Studio app, the card object, read access to transcripts, and the API principal for testing. System Administrators need it too: the card fields are deployed without profile access, so without this permission set the studio, the starter cards, and AI drafts fail with field access errors.

**Experience site guest user:** assign **Fin Card Chat Guest** (the `--site` option does this). Without it, guests see errors and Fin's webhook is rejected. To do it by hand:

1. **Setup, Digital Experiences, All Sites**, then **Builder** next to your site.
2. **Settings, General**, then select the guest user profile link.
3. **View Users**, open the site guest user, then **Permission Set Assignments, Edit Assignments**, and add **Fin Card Chat Guest**.

The guest permission set grants the chat and webhook Apex classes, the `Fin_Agent_API-FinAgent` principal, and Read on User External Credential (required for named-credential callouts).

**Logged-in site members** (if your chat page requires login): assign **Fin Card Chat Guest** to them too, or to a permission set group they already have.

## 7. Add the chat to your Experience site

In **Experience Builder** for your site:

1. **Settings, General**
   - **Public can access the site:** on, if guests should use the chat.
   - **Allow guest users to access public APIs:** on. Fin's webhook arrives as a guest request to Apex REST.
2. **Pages, New Page, Standard Page, New Blank Page**: name it `Ask Fin`, URL `ask-fin`. Set page access to **Public** for guests.
3. From **Components, Custom Components**, drag **Fin Card Chat** onto the page. Configure:

   | Property | Default | Notes |
   | --- | --- | --- |
   | Eyebrow, Headline, Headline accent line, Intro text | Customer Support, ... | Welcome screen copy. |
   | Input placeholder | Ask me anything | |
   | Suggested questions | Compare plans; Track my order; ... | Semicolon-separated. Up to 6 show before the first question. |
   | Agent name | Fin | |
   | Disclaimer | AI responses can be inaccurate. | |
   | Accent color | #2855ed | Buttons and links. |
   | Maximum cards per answer | 5 | 1 to 6. |
   | Card size | studio | `studio` follows each card's size, then the Display setting. |
   | Maximum width, Conversation height | 1040, 820 | Pixels. |

4. Optional: on the home page, add **Fin Search Bar** and set **Chat page URL** to `ask-fin`. Questions typed there open the chat page and are asked automatically.
5. **Card images.** Image hosts must be allowed by Content Security Policy. Add each image host in **Setup, CSP Trusted Sites** with **img-src** checked (context All). The StarGrid sample deploys one for its images. Fin Card Studio warns you when a card's image host is not trusted.
6. **Publish** the site.

The page JSON from the original demo is in `sample-data/stargrid/experience/` for reference.

## 8. Point Fin's webhook at your site

1. Find your site URL: **Setup, Digital Experiences, All Sites**, URL column, for example `https://acme.my.site.com/support`.
2. Your webhook URL is that URL plus `/services/apexrest/fin/webhook`:

   ```
   https://acme.my.site.com/support/services/apexrest/fin/webhook
   ```

3. Check that it is reachable. An unsigned request should return HTTP 401, which proves the site, the guest access, and the Apex class are wired up:

   ```sh
   curl -i -X POST -H 'Content-Type: application/json' -d '{}' \
     https://acme.my.site.com/support/services/apexrest/fin/webhook
   # HTTP/1.1 401 ... {"error":"Invalid webhook signature."}
   ```

   - **403** `You do not have access to the Apex class named: FinWebhookResource`: the guest user does not have **Fin Card Chat Guest** yet (step 6).
   - **404 or an HTML login page:** guest API access is off, or the site prefix is wrong (step 7.1).

4. In Fin, set this URL as the **Fin Agent API webhook URL** and copy the **signing secret** into **Fin Agent Settings, Webhook Secret** (step 5). Details in [CONFIGURE-FIN.md](CONFIGURE-FIN.md).

Fin sends one webhook URL per workspace. If another app already uses your workspace's Agent API webhook, see "Sharing one Fin workspace" in [CONFIGURE-FIN.md](CONFIGURE-FIN.md).

## 9. Create cards

Open **App Launcher, Fin Card Studio**.

- **With the StarGrid sample:** choose **Add starter cards** on the Library page (or use `--seed` in step 3).
- **For your own brand:** choose **New card**, or **Create with AI** if Einstein generative AI is on.

Then open **Match tester**, type a question and optionally Fin's reply or a cited URL, and confirm the right cards come back. See [CARD-STUDIO.md](CARD-STUDIO.md).

## 10. Test end to end

1. Open the site's **Ask Fin** page in a private browser window, which makes you a guest.
2. Ask something your Fin content covers and that matches a card keyword.
3. You should see Fin's answer within a few seconds, then the matching cards, related guides, and sources.
4. In Salesforce, open the **Fin Chat Conversations** tab. Each chat is stored with its messages and the card IDs shown.

If anything fails, check [TROUBLESHOOTING.md](TROUBLESHOOTING.md). Fin's reply appearing in Fin's inbox but not on the page almost always means a webhook problem (step 8).

---

## Upgrading

Pull the latest code and run `scripts/setup.sh -o my-org` again. Your API key, settings, and cards are not overwritten. Deploying replaces component defaults only for new placements; existing pages keep their property values.

## Uninstalling

1. Remove **Fin Card Chat** and **Fin Search Bar** from your site pages and publish.
2. Remove the webhook URL in Fin, and revoke the API key.
3. Delete the Fin Agent Settings org-default record and the API key on the FinAgent principal.
4. Remove the permission set assignments.
5. Delete the metadata. List it from the repo with:

   ```sh
   sf project generate manifest --source-dir force-app --source-dir sample-data/stargrid --name destructiveChanges --output-dir manifest
   echo '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata"><version>67.0</version></Package>' > manifest/package.xml
   sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChanges.xml --target-org my-org
   ```

   Deleting the custom objects also deletes all cards and chat transcripts.
