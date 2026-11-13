/**
 * Apex REST endpoints for Fin Card Studio.
 *   POST /fincards/match  {userText, finText, sourceUrls[]} -> {matches:[{card, hits, reasons}]}
 *   POST /fincards/seed   {} -> {created}
 *   POST /fincards/generate {brief, type?, productId?, current?, instruction?} -> {draft, rationale, model}
 *   POST /fincards/settings {cardSize?, maxCards?} -> {cardSize, maxCards}  (an empty body only reads)
 *   POST /fincards/imagehosts {} -> {hosts[]}  (active CSP Trusted URLs that allow images)
 */
@RestResource(urlMapping='/fincards/*')
global with sharing class FinCardStudioResource {
    @HttpPost
    global static void post() {
        RestRequest request = RestContext.request;
        RestResponse response = RestContext.response;
        response.addHeader('Content-Type', 'application/json');
        String action = request.requestURI.substringAfterLast('/');
        try {
            Map<String, Object> body = request.requestBody == null || request.requestBody.size() == 0
                ? new Map<String, Object>()
                : (Map<String, Object>) JSON.deserializeUntyped(request.requestBody.toString());
            Object result;
            switch on action {
                when 'match' {
                    result = match(body);
                }
                when 'seed' {
                    result = new Map<String, Object>{ 'created' => FinCardCatalog.seed() };
                }
                when 'generate' {
                    result = FinCardGenerator.generate(body);
                }
                when 'settings' {
                    result = settings(body);
                }
                when 'imagehosts' {
                    result = new Map<String, Object>{ 'hosts' => imageHosts() };
                }
                when else {
                    response.statusCode = 404;
                    result = new Map<String, Object>{ 'error' => 'Unknown action.' };
                }
            }
            response.responseBody = Blob.valueOf(JSON.serialize(result));
        } catch (Exception e) {
            response.statusCode = 400;
            response.responseBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{ 'error' => e.getMessage() }));
        }
    }

    public static Map<String, Object> match(Map<String, Object> body) {
        List<String> urls = new List<String>();
        if (body.get('sourceUrls') instanceof List<Object>) {
            for (Object url : (List<Object>) body.get('sourceUrls')) {
                urls.add(String.valueOf(url));
            }
        }
        Integer maxCards = body.get('maxCards') instanceof Integer ? (Integer) body.get('maxCards') : FinCardMatcher.maxCardsPerTurn();
        List<Map<String, Object>> matches = new List<Map<String, Object>>();
        for (FinCardMatcher.Match m : FinCardMatcher.match((String) body.get('userText'), (String) body.get('finText'), urls, maxCards, null)) {
            matches.add(new Map<String, Object>{ 'card' => FinCardMatcher.toCard(m.card), 'hits' => m.hits, 'reasons' => m.reasons });
        }
        return new Map<String, Object>{ 'matches' => matches };
    }

    /** Reads, and optionally updates, the chat display settings. Never returns the webhook secret or other fields. */
    public static Map<String, Object> settings(Map<String, Object> body) {
        Boolean setSize = body.get('cardSize') instanceof String;
        Boolean setMax = body.get('maxCards') instanceof Integer;
        if (setSize || setMax) {
            if (!Schema.SObjectType.Fin_Agent_Settings__c.isUpdateable() || !Schema.SObjectType.Fin_Agent_Settings__c.isCreateable()) {
                throw new StudioException('You need permission to edit Fin Agent Settings to change display settings.');
            }
            Fin_Agent_Settings__c settings = Fin_Agent_Settings__c.getOrgDefaults();
            if (setSize) {
                settings.Card_Size__c = FinCardMatcher.normalizeSize((String) body.get('cardSize'));
            }
            if (setMax) {
                settings.Max_Cards_Per_Turn__c = FinCardMatcher.clampCards((Integer) body.get('maxCards'));
            }
            upsert as system settings;
        }
        return new Map<String, Object>{ 'cardSize' => FinCardMatcher.cardSize(), 'maxCards' => FinCardMatcher.maxCardsPerTurn() };
    }

    public static List<String> imageHosts() {
        List<String> hosts = new List<String>();
        for (CspTrustedSite site : [
            SELECT EndpointUrl
            FROM CspTrustedSite
            WHERE IsActive = TRUE AND IsApplicableToImgSrc = TRUE
            WITH SYSTEM_MODE
            ORDER BY EndpointUrl
            LIMIT 500
        ]) {
            hosts.add(site.EndpointUrl);
        }
        return hosts;
    }

    public class StudioException extends Exception {
    }
}
