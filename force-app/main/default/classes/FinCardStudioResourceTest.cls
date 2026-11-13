@IsTest
private class FinCardStudioResourceTest {
    private static Map<String, Object> post(String action, String body) {
        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.requestURI = '/services/apexrest/fincards/' + action;
        RestContext.request.requestBody = Blob.valueOf(body);
        FinCardStudioResource.post();
        return (Map<String, Object>) JSON.deserializeUntyped(RestContext.response.responseBody.toString());
    }

    @IsTest
    static void readsAndSavesDisplaySettings() {
        insert as system new Fin_Agent_Settings__c(SetupOwnerId = UserInfo.getOrganizationId(), Webhook_Secret__c = 'keep-me');

        Map<String, Object> current = post('settings', '{}');
        Assert.areEqual('standard', current.get('cardSize'));
        Assert.areEqual(FinCardMatcher.DEFAULT_MAX_CARDS, current.get('maxCards'));
        Assert.isFalse(current.containsKey('Webhook_Secret__c'));

        Map<String, Object> saved = post('settings', '{"cardSize":"compact","maxCards":12}');
        Assert.areEqual('compact', saved.get('cardSize'));
        Assert.areEqual(FinCardMatcher.CARD_CEILING, saved.get('maxCards'));

        saved = post('settings', '{"cardSize":"tiny"}');
        Assert.areEqual('standard', saved.get('cardSize'));
        Assert.areEqual(FinCardMatcher.CARD_CEILING, saved.get('maxCards'), 'Only the sent field changes');
        Assert.areEqual('keep-me', Fin_Agent_Settings__c.getOrgDefaults().Webhook_Secret__c);
    }

    @IsTest
    static void listsTrustedImageHosts() {
        Map<String, Object> result = post('imagehosts', '{}');
        Assert.isTrue(result.get('hosts') instanceof List<Object>);
        Assert.areEqual([SELECT COUNT() FROM CspTrustedSite WHERE IsActive = TRUE AND IsApplicableToImgSrc = TRUE], ((List<Object>) result.get('hosts')).size());
    }

    @IsTest
    static void rejectsUnknownActions() {
        Map<String, Object> result = post('nope', '{}');
        Assert.areEqual(404, RestContext.response.statusCode);
        Assert.areEqual('Unknown action.', result.get('error'));
    }
}
